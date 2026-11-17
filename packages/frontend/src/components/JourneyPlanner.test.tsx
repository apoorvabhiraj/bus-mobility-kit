import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JourneyPlanner } from '@/components/JourneyPlanner';
import { useJourneyStore } from '@/store/journeyStore';

describe('JourneyPlanner', () => {
  it('renders origin and destination inputs', () => {
    render(<JourneyPlanner />);
    expect(screen.getByLabelText(/origin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
  });

  it('shows no results before searching', () => {
    render(<JourneyPlanner />);
    expect(screen.queryByText(/route options/i)).not.toBeInTheDocument();
  });
});

describe('Journey store', () => {
  it('has a defined initial state', () => {
    const state = useJourneyStore.getState();
    expect(state.origin).toBeNull();
    expect(state.destination).toBeNull();
    expect(state.loading).toBe(false);
  });
});
