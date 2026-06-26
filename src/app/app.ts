import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { debounceTime } from 'rxjs/operators';

interface Project {
  id: string;
  name: string;
  html: string;
  css: string;
  js: string;
  lastModified: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [ReactiveFormsModule, MatIconModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private sanitizer = inject(DomSanitizer);

  projects = signal<Project[]>(this.loadProjects());
  currentView = signal<'home' | 'editor' | 'preview'>('home');
  activeProjectId = signal<string | null>(null);
  activeTab = signal<'html' | 'css' | 'js'>('html');
  searchControl = new FormControl('');

  htmlControl = new FormControl('');
  cssControl = new FormControl('');
  jsControl = new FormControl('');
  
  constructor() {
    this.htmlControl.valueChanges.pipe(debounceTime(400)).subscribe(val => this.updateActiveProject('html', val || ''));
    this.cssControl.valueChanges.pipe(debounceTime(400)).subscribe(val => this.updateActiveProject('css', val || ''));
    this.jsControl.valueChanges.pipe(debounceTime(400)).subscribe(val => this.updateActiveProject('js', val || ''));
  }

  filteredProjects = computed(() => {
    const query = (this.searchControl.value || '').toLowerCase();
    return this.projects()
      .filter(p => p.name.toLowerCase().includes(query))
      .sort((a, b) => b.lastModified - a.lastModified);
  });

  activeProject = computed(() => {
    const id = this.activeProjectId();
    return this.projects().find(p => p.id === id);
  });

  srcDoc = computed(() => {
    const project = this.activeProject();
    if (!project) return this.sanitizer.bypassSecurityTrustHtml('');
    
    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            ${project.css}
          </style>
        </head>
        <body>
          ${project.html}
          <script>
            ${project.js}
          <\/script>
        </body>
      </html>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(combined);
  });

  loadProjects(): Project[] {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('web_playground_projects');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse projects', e);
        }
      }
    }
    return [];
  }

  saveProjects(projects: Project[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('web_playground_projects', JSON.stringify(projects));
    }
  }

  createProject() {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: `Project ${this.projects().length + 1}`,
      html: '<h1>Hello World</h1>\n<p>Start editing!</p>',
      css: 'body {\n  font-family: sans-serif;\n  padding: 1rem;\n}',
      js: 'console.log("Ready");',
      lastModified: Date.now()
    };
    const updated = [...this.projects(), newProject];
    this.projects.set(updated);
    this.saveProjects(updated);
    this.openProject(newProject.id);
  }

  openProject(id: string) {
    const project = this.projects().find(p => p.id === id);
    if (project) {
      this.activeProjectId.set(id);
      this.htmlControl.setValue(project.html, { emitEvent: false });
      this.cssControl.setValue(project.css, { emitEvent: false });
      this.jsControl.setValue(project.js, { emitEvent: false });
      this.currentView.set('editor');
      this.activeTab.set('html');
    }
  }

  updateActiveProject(field: 'html' | 'css' | 'js', value: string) {
    const id = this.activeProjectId();
    if (!id) return;
    
    const currentProjects = this.projects();
    const index = currentProjects.findIndex(p => p.id === id);
    if (index > -1) {
      const updatedProjects = [...currentProjects];
      updatedProjects[index] = {
        ...updatedProjects[index],
        [field]: value,
        lastModified: Date.now()
      };
      this.projects.set(updatedProjects);
      this.saveProjects(updatedProjects);
    }
  }

  deleteProject(id: string, event: Event) {
    event.stopPropagation();
    const updated = this.projects().filter(p => p.id !== id);
    this.projects.set(updated);
    this.saveProjects(updated);
    if (this.activeProjectId() === id) {
      this.closeProject();
    }
  }

  closeProject() {
    this.activeProjectId.set(null);
    this.currentView.set('home');
  }

  showPreview() {
    this.currentView.set('preview');
  }

  closePreview() {
    this.currentView.set('editor');
  }

  renameProject(id: string, newName: string) {
    const currentProjects = this.projects();
    const index = currentProjects.findIndex(p => p.id === id);
    if (index > -1 && newName.trim()) {
      const updatedProjects = [...currentProjects];
      updatedProjects[index] = {
        ...updatedProjects[index],
        name: newName.trim(),
        lastModified: Date.now()
      };
      this.projects.set(updatedProjects);
      this.saveProjects(updatedProjects);
    }
  }

  clearCurrentTab() {
    const tab = this.activeTab();
    if (tab === 'html') this.htmlControl.setValue('');
    else if (tab === 'css') this.cssControl.setValue('');
    else if (tab === 'js') this.jsControl.setValue('');
  }
}
