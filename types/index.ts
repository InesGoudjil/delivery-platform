export * from './database.types';
export * from '../core/entities/workspace';
export * from '../core/entities/project';
export * from '../core/entities/client';
export * from '../core/entities/asset';
export * from '../core/entities/feedback';

// Compatibility alias for UI components
import { Feedback } from '../core/entities/feedback';
export type Comment = Feedback;
