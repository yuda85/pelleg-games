import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'pg-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <a class="skip" href="#main">דִּלּוּג לַתֹּכֶן</a>
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
})
export class App {}
