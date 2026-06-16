import { Component, HostListener, ElementRef, Renderer2, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-custom-cursor',
  standalone: true,
  template: `
    <div class="custom-cursor" #cursor>
      <div class="cursor-pointer">
        <img [src]="pointerSrc" alt="" draggable="false" />
      </div>
      <div class="cursor-dog" #dog>
        <img [src]="dogSrc" alt="" draggable="false" />
      </div>
    </div>
  `,
  styles: [`
    .custom-cursor {
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-8px, -8px);
      will-change: transform;
      transition: none;
    }
    .cursor-pointer {
      position: absolute;
      width: 24px;
      height: 24px;
      left: 0;
      top: 0;
      transition: transform 0.15s ease;
    }
    .cursor-pointer img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .cursor-dog {
      position: absolute;
      width: 48px;
      height: 48px;
      left: 18px;
      top: -20px;
      transition: transform 0.2s ease-out;
      animation: float 2s ease-in-out infinite;
    }
    .cursor-dog img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .cursor-dog.bounce {
      animation: bounce 0.3s ease-out;
    }
    .cursor-dog.hover {
      transform: scale(1.1);
    }
    .cursor-pointer.glow {
      filter: drop-shadow(0 0 8px rgba(79, 195, 247, 0.8));
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }
    @keyframes bounce {
      0% { transform: scale(1); }
      30% { transform: scale(0.85); }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `]
})
export class CustomCursorComponent implements OnInit, OnDestroy {
  pointerSrc = '/assets/cursor/dog-cursor.svg';
  dogSrc = '/assets/cursor/dog-face.svg';
  private rafId = 0;
  private mouseX = 0;
  private mouseY = 0;
  private isHovering = false;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.checkInteractiveElements();
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.updatePosition());
    }
  }

  private updatePosition() {
    const cursor = this.el.nativeElement.querySelector('.custom-cursor');
    if (cursor) {
      cursor.style.transform = `translate(${this.mouseX}px, ${this.mouseY}px)`;
    }
    this.rafId = 0;
  }

  @HostListener('document:click')
  onClick() {
    const dog = this.el.nativeElement.querySelector('.cursor-dog');
    if (dog) {
      dog.classList.remove('bounce');
      void (dog as HTMLElement).offsetWidth;
      dog.classList.add('bounce');
    }
  }

  private checkInteractiveElements() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.matches?.(
        'a, button, [role="button"], input[type="submit"], input[type="button"], select, [onclick]'
      ) || target.closest?.('a, button, [role="button"]');
      
      const dog = this.el.nativeElement.querySelector('.cursor-dog');
      const pointer = this.el.nativeElement.querySelector('.cursor-pointer');
      
      if (isInteractive && !this.isHovering) {
        this.isHovering = true;
        if (dog) dog.classList.add('hover');
        if (pointer) pointer.classList.add('glow');
      } else if (!isInteractive && this.isHovering) {
        this.isHovering = false;
        if (dog) dog.classList.remove('hover');
        if (pointer) pointer.classList.remove('glow');
      }
    }, { passive: true });
  }
}
