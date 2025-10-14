import { ActionType } from '../enums';
import { User } from './User';

export interface UserActionHistory {
  id: string;
  userId: string;
  user: User;
  actionType: ActionType;
  details: Record<string, unknown> | null; // JSON data
  relatedItemId?: string;
  relatedItemType?: string;
  performedAt: Date;
}
