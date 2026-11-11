export class Router {
  constructor() {
    this.links = document.querySelectorAll('[data-view]');
    this.pages = document.querySelectorAll('.view-page');
    this.init();
  }

  init() {
    this.links.forEach(link => {
      link.addEventListener('click', (e) => {
        const viewTarget = e.currentTarget.dataset.view;
        this.navigate(viewTarget);
      });
    });
  }

  navigate(viewName) {
    this.pages.forEach(page => {
      page.classList.toggle('active', page.id === `view-${viewName}`);
    });

    this.links.forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}