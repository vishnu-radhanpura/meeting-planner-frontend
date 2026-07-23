import { Component, DoCheck, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './auth.component';
import { MeetingFormComponent } from './meeting-form.component';
import { MeetingListComponent } from './meeting-list.component';
import { MeetingPlannerService } from './meeting-planner.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AuthComponent, MeetingFormComponent, MeetingListComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements DoCheck, OnInit {
  protected readonly title = 'Meeting Planner';

  constructor(public readonly service: MeetingPlannerService) {}

  ngOnInit() {
    console.log('[App] ngOnInit: checking existing session');
    this.service.fetchUserProfile().subscribe({
      next: (profile) => {
        console.log('[App] fetchUserProfile: response', profile);
        const profileUser = profile?.data ?? profile?.user ?? profile ?? null;
        if (profileUser && typeof profileUser === 'object') {
          if (!profileUser.name) {
            profileUser.name = profileUser.email || '';
          }
          this.service.setUser(profileUser);
          console.log('[App] ngOnInit: restored user', profileUser);
          this.service.loadMeetings();
        } else {
          console.log('[App] ngOnInit: no session found');
          this.service.setUser(null);
        }
      },
      error: (err) => {
        console.log('[App] fetchUserProfile error (not logged in)', err?.status ?? err);
        this.service.setUser(null);
      }
    });
  }

  ngDoCheck() {
    console.log('[App] ngDoCheck service.user=', this.service.user, 'message=', this.service.message, 'messageType=', this.service.messageType);
  }

  public setMode(mode: 'login' | 'register') {
    this.service.authMode = mode;
    this.service.clearAlerts();
  }

  public sessionActive(): boolean {
    console.log('[App] sessionActive called, user=', this.service.user);
    return !!this.service.user;
  }
}
