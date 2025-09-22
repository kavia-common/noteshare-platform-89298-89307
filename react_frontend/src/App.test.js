import { render, screen } from '@testing-library/react';
import App from './App';

test('renders NoteShare brand in navbar', () => {
  render(<App />);
  const brand = screen.getAllByText(/NoteShare/i)[0];
  expect(brand).toBeInTheDocument();
});
