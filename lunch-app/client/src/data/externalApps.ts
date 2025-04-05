export interface ExternalApp {
  id: string;
  name: string;
  url: string;
  icon: string; // SVG path data or content
  position: {
    top: number;
    left: number;
  };
  windowWidth?: number;
  windowHeight?: number;
}

const externalApps: ExternalApp[] = [
  {
    id: 'uncorn-adventure',
    name: 'Uncorn',
    url: 'https://nickfranceschina.github.io/uncorn-adventure/',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="28" height="28" rx="5" fill="#FFC0CB" stroke="#000000" stroke-width="1" /><path d="M16 5L17.5 11H22.5L18.5 15L20 21L16 17L12 21L13.5 15L9.5 11H14.5L16 5Z" fill="#FFFFFF" stroke="#000000" stroke-width="1" /><path d="M16 5L14 8L12 10L16 10L20 10L18 8L16 5Z" fill="#FF69B4" /></svg>`,
    position: {
      top: 255,
      left: 10
    },
    windowWidth: 800,
    windowHeight: 600
  },
  {
    id: 'kitt-dashboard',
    name: 'KITT',
    url: 'https://nickfranceschina.github.io/kitt-dashboard/',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="#000000" stroke="#FF0000" stroke-width="2" /><rect x="9" y="14" width="14" height="4" rx="2" fill="#FF0000" /><rect x="6" y="14" width="2" height="4" fill="#FF0000" /><rect x="24" y="14" width="2" height="4" fill="#FF0000" /></svg>`,
    position: {
      top: 335,
      left: 10
    },
    windowWidth: 1000,
    windowHeight: 700
  }
];

export default externalApps; 