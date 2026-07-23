import { ApplicationRef, ChangeDetectorRef, Component, Input, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { MeetingPlannerService } from './meeting-planner.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="panel auth-panel">
      <div class="panel-heading">
        <h2>{{ mode === 'login' ? 'Login to your account' : 'Register a new account' }}</h2>
        <p>{{ mode === 'login' ? 'Enter your credentials to continue.' : 'Provide a name, email, and password.' }}</p>
      </div>

      <form class="form-grid" (ngSubmit)="submitAuth()" novalidate>
        <div class="form-alert auth-status" *ngIf="statusMessage" [ngClass]="{ 'success': statusType === 'success', 'error': statusType === 'error' }" aria-live="polite" role="status">
          <span class="alert-icon" aria-hidden="true">!</span>
          <p>{{ statusMessage }}</p>
          <button type="button" class="close-button" aria-label="Close auth message" (click)="statusMessage = ''; statusType = ''">×</button>
        </div>

        <label class="field" *ngIf="mode === 'register'">
          <span>Name</span>
          <input type="text" [(ngModel)]="name" name="name" required />
        </label>

        <label class="field">
          <span>Email</span>
          <input type="email" [(ngModel)]="email" name="email" required />
        </label>

        <label class="field">
          <span>Password</span>
          <input type="password" [(ngModel)]="password" name="password" required minlength="6" />
        </label>

        <div class="form-actions">
          <button class="button button-primary" type="submit">
            {{ mode === 'login' ? 'Login' : 'Register' }}
          </button>
        </div>
      </form>
    </article>
  `
})
export class AuthComponent {
  private _mode: 'login' | 'register' = 'login';

  @Input()
  public set mode(value: 'login' | 'register') {
    this._mode = value;
    this.statusMessage = '';
    this.statusType = '';
  }
  public get mode(): 'login' | 'register' {
    return this._mode;
  }

  public name = '';
  public email = '';
  public password = '';
  public authLoading = false;
  public statusMessage = '';
  public statusType: 'success' | 'error' | '' = '';

  constructor(public readonly service: MeetingPlannerService, private readonly cd: ChangeDetectorRef, private readonly appRef: ApplicationRef, private readonly ngZone: NgZone) {}

  protected submitAuth() {
    this.authLoading = true;
    this.statusMessage = '';
    this.statusType = '';
    this.service.clearAlerts();
    console.log('submitAuth: start', { mode: this.mode, name: this.name, email: this.email });

    this.service.submitAuth(this.name, this.email, this.password)
      .pipe(finalize(() => {
        this.authLoading = false;
        console.log('submitAuth: finalize authLoading false');
      }))
      .subscribe({
        next: (response) => {
          console.log('submitAuth: response', response);
          if (response?.success === false) {
            this.statusType = 'error';
            this.statusMessage = response?.message || response?.error || 'Authentication failed.';
            console.log('submitAuth: response indicates failure', this.statusMessage);
            return;
          }

          if (this.mode === 'register') {
            const registrationMessage = response?.message || 'Registration successful. Please log in with your credentials.';
            this.statusType = 'success';
            this.statusMessage = registrationMessage;
            console.log('submitAuth: registration success', registrationMessage);
            this.resetForm();
            try {
              this.cd.detectChanges();
            } catch (err) {
              console.warn('submitAuth: detectChanges after registration success failed', err);
            }
            return;
          }

          const payload: any = { email: this.email, password: this.password, name: this.name };
          const rawUser = response?.data ?? response?.user;
          if (rawUser && typeof rawUser === 'object') {
            console.log('submitAuth: response contains user object', rawUser);
            this.service.setUser(rawUser);
            console.log('submitAuth: assigned service.user from response', rawUser);
            this.finishLogin();
          } else {
            console.log('submitAuth: login response did not include a user object, using fallback user and fetching profile');
            const fallbackUser = { name: payload.name ?? '', email: payload.email };
            if (!fallbackUser.name) {
              fallbackUser.name = fallbackUser.email || '';
            }
            this.service.setUser(fallbackUser);
            console.log('submitAuth: assigned fallback service.user', fallbackUser);
            this.finishLogin();

            this.service.fetchUserProfile().subscribe({
              next: (profile) => {
                console.log('submitAuth: fetched user profile', profile);
                const profileUser = profile?.data ?? profile?.user ?? profile;
                console.log('submitAuth: normalized profile user', profileUser);
                if (profileUser && typeof profileUser === 'object') {
                  this.service.setUser(profileUser);
                  if (!this.service.user.name) {
                    this.service.user.name = payload.name || this.service.user.email || '';
                  }
                  console.log('submitAuth: updated service.user from profile', this.service.user);
                  this.cd.detectChanges();
                } else {
                  console.log('submitAuth: profile response is not an object', profileUser);
                }
              },
              error: (error) => {
                console.error('submitAuth: failed to fetch user profile', error);
              }
            });
          }
        },
        error: (error) => {
          console.error('submitAuth: error', error);
          this.statusType = 'error';
          if (error.status === 409) {
            this.statusMessage = this.service.getErrorMessage(error) || 'Registration failed: account already exists.';
          } else if (error.status && error.status >= 500) {
            this.statusMessage = 'Internal server error. Please try again later.';
          } else {
            this.statusMessage = this.service.getErrorMessage(error) || 'An unknown error occurred.';
          }
          console.log('submitAuth: error message', this.statusMessage);
          this.cd.detectChanges();
        }
      });
  }

  private finishLogin() {
    console.log('finishLogin: before applying changes, service.user=', this.service.user);
    this.statusType = 'success';
    this.statusMessage = `${this.mode === 'register' ? 'Registered' : 'Logged in'} successfully.`;
    console.log('submitAuth: success message', this.statusMessage);
    this.ngZone.run(() => {
      this.cd.detectChanges();
      console.log('finishLogin: inside ngZone run, service.user=', this.service.user);
    });
    this.service.loadMeetings();
  }

  private resetForm() {
    this.name = '';
    this.email = '';
    this.password = '';
  }
}

