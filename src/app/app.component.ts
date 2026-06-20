import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    const redirect = sessionStorage.getItem('gh_redirect');
    if (redirect) {
      sessionStorage.removeItem('gh_redirect');
      this.router.navigateByUrl(redirect);
    }
  }
}
