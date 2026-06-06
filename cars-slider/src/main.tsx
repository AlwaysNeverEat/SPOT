import { createRoot } from 'react-dom/client';
import { CarsSlider } from './CarsSlider';

function mount() {
  const el = document.getElementById('spot-cars-slider');
  if (!el || el.dataset.mounted) return;
  el.dataset.mounted = '1';
  createRoot(el).render(<CarsSlider />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
