import { calculateDenominationTotal } from './utils/cash-calculations';
import { DenominationCounts } from './types/cash-register';

interface TestCase {
    name: string;
    counts: DenominationCounts;
    expected: number;
}

const testCases: TestCase[] = [
    {
        name: 'Empty counts',
        counts: {},
        expected: 0
    },
    {
        name: 'New format only',
        counts: { 'banknote_500': 1, 'banknote_200': 2, 'coin_10': 3 },
        expected: 500 * 1 + 200 * 2 + 10 * 3 // 930
    },
    {
        name: 'Legacy format only',
        counts: { '500': 1, '200': 2, '10': 3 },
        expected: 500 * 1 + 200 * 2 + 10 * 3 // 930
    },
    {
        name: 'Mixed format',
        counts: { 'banknote_1000': 1, '500': 1, 'coin_5': 2, '2': 5 },
        expected: 1000 + 500 + 10 + 10 // 1520
    },
    {
        name: 'Decimals (coins)',
        counts: { 'coin_0.5': 10, '0.5': 10 },
        expected: 5 + 5 // 10
    }
];

testCases.forEach(tc => {
    const result = calculateDenominationTotal(tc.counts);
    if (result === tc.expected) {
        console.log(`✅ ${tc.name}: Passed (${result})`);
    } else {
        console.error(`❌ ${tc.name}: Failed. Expected ${tc.expected}, got ${result}`);
    }
});
