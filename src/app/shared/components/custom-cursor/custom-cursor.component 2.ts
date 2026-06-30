import { Component, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-custom-cursor',
  standalone: true,
  template: `
    <div class="custom-cursor" #cursor>
      <!-- Pointer SVG inline -->
      <div class="cursor-pointer" #pointer>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">
          <defs>
            <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4FC3F7"/>
              <stop offset="100%" stop-color="#29B6F6"/>
            </linearGradient>
          </defs>
          <path d="M5 3 L5 22 L9.5 17.5 L14 26 L16.5 24.5 L12 16 L18 15 Z" fill="url(#cg)" stroke="#fff" stroke-width="0.8" stroke-linejoin="round"/>
        </svg>
      </div>
      <!-- Dog face SVG inline -->
      <div class="cursor-dog" #dog>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
          <defs>
            <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#4FC3F7" flood-opacity="0.4"/>
            </filter>
          </defs>
          <path d="M18 20 Q13 5 24 12" fill="#29B6F6"/>
          <path d="M46 20 Q51 5 40 12" fill="#29B6F6"/>
          <ellipse cx="32" cy="32" rx="20" ry="19" fill="#4FC3F7" filter="url(#ds)"/>
          <path d="M19 19 Q16 9 24 14" fill="#81D4FA" opacity="0.6"/>
          <path d="M45 19 Q48 9 40 14" fill="#81D4FA" opacity="0.6"/>
          <ellipse cx="24" cy="29" rx="3.5" ry="4" fill="#fff"/>
          <ellipse cx="40" cy="29" rx="3.5" ry="4" fill="#fff"/>
          <ellipse cx="25" cy="29" rx="2" ry="2.5" fill="#1a1a1a"/>
          <ellipse cx="41" cy="29" rx="2" ry="2.5" fill="#1a1a1a"/>
          <circle cx="26" cy="27.5" r="1" fill="#fff"/>
          <circle cx="42" cy="27.5" r="1" fill="#fff"/>
          <ellipse cx="18" cy="35" rx="3.5" ry="2" fill="#81D4FA" opacity="0.5"/>
          <ellipse cx="46" cy="35" rx="3.5" ry="2" fill="#81D4FA" opacity="0.5"/>
          <ellipse cx="32" cy="35" rx="3" ry="2.2" fill="#1a1a1a"/>
          <path d="M27 38 Q32 43 37 38" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M30.5 40 Q30.5 47 32 47 Q33.5 47 33.5 40" fill="#ff6b8a" stroke="#ff4d6d" stroke-width="0.8"/>
        </svg>
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
    }
    .cursor-pointer {
      position: absolute;
      width: 24px;
      height: 24px;
      left: 0;
      top: 0;
      transition: transform 0.15s ease;
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
  private rafId = 0;
  private mouseX = 0;
  private mouseY = 0;
  private isHovering = false;

  constructor(private el: ElementRef) {}

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
