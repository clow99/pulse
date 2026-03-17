'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '@/components/motion';

interface TaskItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  time: string;
  type: 'page' | 'referrer' | 'event';
}

interface TasksListProps {
  recentItems: TaskItem[];
  eventItems: TaskItem[];
}

export function TasksList({ recentItems, eventItems }: TasksListProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'events'>('recent');

  const items = activeTab === 'recent' ? recentItems : eventItems;

  return (
    <FadeIn>
      <div className="pulse-tasks-container">
        <div className="pulse-tasks-header">
          <h3 className="pulse-section-title">Activity</h3>
          <div className="pulse-tasks-tabs">
            <button
              type="button"
              className={`pulse-tasks-tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              Recent
            </button>
            <button
              type="button"
              className={`pulse-tasks-tab ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events
            </button>
          </div>
        </div>

        <div className="pulse-tasks-list">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {items.length === 0 ? (
                <div className="pulse-tasks-empty">
                  No {activeTab === 'recent' ? 'recent activity' : 'events'} yet
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="pulse-task-item">
                    <div className={`pulse-task-icon pulse-task-icon--${item.type}`}>
                      {item.icon}
                    </div>
                    <div className="pulse-task-content">
                      <div className="pulse-task-title">{item.title}</div>
                      <div className="pulse-task-detail">{item.detail}</div>
                    </div>
                    <div className="pulse-task-time">{item.time}</div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </FadeIn>
  );
}
