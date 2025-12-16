export interface PromotionCondition {
    type: 'product' | 'category' | 'total_amount';
    targetIds?: string[]; // IDs of products or categories
    targetNames?: string[]; // Names for display
    operator: 'gte'; // currently only 'greater than or equal' logic
    value: number; // quantity or amount
    unit?: 'qty' | 'uah';
}

export interface PromotionResult {
    type: 'percent_discount' | 'fixed_discount' | 'bonus';
    value: number;
}

export interface Promotion {
    id?: string;
    _id?: string;
    name: string;
    startDate: string; // ISO Date string
    endDate: string; // ISO Date string
    venues: 'all' | string[]; // 'all' or array of venue attributes/ids

    // Settings
    autoApply: boolean;
    earnBonuses: boolean;

    // Conditions
    conditions: PromotionCondition[];

    // Schedule
    daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
    timeStart: string; // "00:00"
    timeEnd: string; // "23:59"

    // Participants
    audience: 'all' | 'registered' | 'groups'; // 'all' for now

    // Result
    result: PromotionResult;

    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
