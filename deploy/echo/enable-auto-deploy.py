"""Opt the existing Pulse app into Echo's Watchtower without exposing runtime secrets."""
import argparse
import copy
import fcntl
import http.client
import json
import os
import re
import socket
import sys
import time
import urllib.parse
import urllib.request

IMAGE = '10.0.0.2:5000/pulse:live'
NETWORK = 'pulsewebanalyticscom_default'
LABEL = 'com.centurylinklabs.watchtower.enable'
PORTS = {'3000/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '3042'}]}


class Connection(http.client.HTTPConnection):
    def __init__(self):
        super().__init__('localhost', timeout=90)

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(90)
        self.sock.connect('/var/run/docker.sock')


def api(method, path, body=None):
    connection = Connection()
    try:
        connection.request(method, path, body=json.dumps(body).encode() if body is not None else None,
                           headers={'Content-Type': 'application/json'})
        response = connection.getresponse()
        data = response.read()
        if response.status not in (200, 201, 204, 304):
            raise RuntimeError(f'Docker operation failed: HTTP {response.status}, {method} {path}')
        return json.loads(data) if data else None
    finally:
        connection.close()


def inspect(name):
    return api('GET', '/containers/' + name + '/json')


def ready(container_id, revision, timeout=90):
    for _ in range(timeout):
        state = inspect(container_id)['State']
        if not state['Running']:
            raise RuntimeError('Pulse exited before readiness')
        try:
            with urllib.request.urlopen('http://127.0.0.1:3042/api/health/ready', timeout=3) as response:
                health = json.load(response)
            if (health.get('ready') is True and health.get('release') == revision
                    and health.get('database') == 'ok' and health.get('migrations') == 'ok'
                    and state.get('Health', {}).get('Status') == 'healthy'):
                return
        except (OSError, ValueError):
            pass
        time.sleep(1)
    raise RuntimeError('Pulse readiness did not match the expected release')


def database_identity():
    database = inspect('pulse-postgres')
    return database['Id'], database['State']['StartedAt'], database['State']['Running']


def enable(revision):
    if socket.gethostname() != 'echo' or not re.fullmatch('[a-f0-9]{40}', revision):
        raise RuntimeError('Expected Echo and a full release SHA')
    state_dir = os.path.expanduser('~/.local/state/pulse')
    os.makedirs(state_dir, mode=0o700, exist_ok=True)
    with open(state_dir + '/deployment.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        previous = inspect('pulse')
        ready(previous['Id'], revision, timeout=15)
        if previous['Config']['Image'] == IMAGE and previous['Config'].get('Labels', {}).get(LABEL) == 'true':
            print(json.dumps({'status': 'already-enabled', 'release': revision}), flush=True)
            return
        if previous.get('Mounts') or previous['HostConfig']['PortBindings'] != PORTS:
            raise RuntimeError('Unexpected app mounts or port binding; no change was made')
        networks = previous['NetworkSettings']['Networks']
        if set(networks) != {NETWORK} or networks[NETWORK].get('IPAMConfig'):
            raise RuntimeError('Unexpected network configuration; no change was made')
        image = api('GET', '/images/' + urllib.parse.quote(IMAGE, safe='') + '/json')
        if image['Id'] != previous['Image'] or image['Config'].get('Labels', {}).get('org.opencontainers.image.revision') != revision:
            raise RuntimeError('Pull live and confirm it matches the current release before enabling automatic updates')
        database_before = database_identity()
        # The existing settings remain opaque, in memory, and on the Docker daemon.
        config = copy.deepcopy(previous['Config'])
        config['Image'] = IMAGE
        config.setdefault('Labels', {})[LABEL] = 'true'
        config['HostConfig'] = copy.deepcopy(previous['HostConfig'])
        aliases = [alias for alias in networks[NETWORK].get('Aliases', []) or []
                   if alias not in (previous['Id'], previous['Id'][:12])]
        config['NetworkingConfig'] = {'EndpointsConfig': {NETWORK: {'Aliases': aliases}}}
        stamp = time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
        new_id = None
        switched = False
        rollback_name = 'pulse-before-auto-' + stamp
        try:
            if inspect('pulse')['Id'] != previous['Id']:
                raise RuntimeError('Pulse changed concurrently; switch aborted')
            new_id = api('POST', '/containers/create?name=pulse-auto-next-' + stamp, config)['Id']
            switched = True
            api('POST', '/containers/' + previous['Id'] + '/stop?t=20')
            api('POST', '/containers/' + previous['Id'] + '/rename?name=' + rollback_name)
            api('POST', '/containers/' + new_id + '/rename?name=pulse')
            api('POST', '/containers/' + new_id + '/start')
            ready(new_id, revision)
            current = inspect(new_id)
            if sorted(previous['Config'].get('Env', [])) != sorted(current['Config'].get('Env', [])):
                raise RuntimeError('Runtime settings were not preserved')
            if database_identity() != database_before:
                raise RuntimeError('Database container identity changed')
            print(json.dumps({'status': 'enabled', 'image': IMAGE, 'release': revision,
                              'runtime_settings_preserved': True, 'database_unchanged': True,
                              'rollback_container': rollback_name}), flush=True)
        except Exception:
            if new_id:
                api('DELETE', '/containers/' + new_id + '?force=true')
            if switched:
                if inspect(previous['Id'])['Name'] != '/pulse':
                    api('POST', '/containers/' + previous['Id'] + '/rename?name=pulse')
                api('POST', '/containers/' + previous['Id'] + '/start')
                ready(previous['Id'], revision)
                print(json.dumps({'status': 'rolled-back', 'release': revision}), flush=True)
            raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-release', required=True)
    arguments = parser.parse_args()
    try:
        enable(arguments.expected_release)
    except Exception as error:
        print(json.dumps({'status': 'failed', 'reason': str(error)}), flush=True)
        sys.exit(1)
