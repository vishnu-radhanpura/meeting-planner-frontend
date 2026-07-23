import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MeetingPlannerService } from './meeting-planner.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-meeting-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="meeting-form-card">
      <h3>Create a meeting</h3>
      <form class="form-grid" (ngSubmit)="submitMeeting()" novalidate>
        <label class="field">
          <span>Title</span>
          <input type="text" [(ngModel)]="title" name="title" required />
        </label>
        <label class="field">
          <span>Location</span>
          <input type="text" [(ngModel)]="location" name="location" required />
        </label>
        <label class="field">
          <span>Start time</span>
          <input type="datetime-local" [(ngModel)]="startTime" name="startTime" required />
        </label>
        <label class="field">
          <span>End time</span>
          <input type="datetime-local" [(ngModel)]="endTime" name="endTime" required />
        </label>
        <label class="field field-full">
          <span>Description</span>
          <textarea rows="3" [(ngModel)]="description" name="description"></textarea>
        </label>
        <label class="field field-full">
          <span>Participants</span>
          <input type="text" [(ngModel)]="participants" name="participants" placeholder="comma-separated emails" required />
        </label>
        <div class="form-actions">
          <button class="button button-primary" type="submit" [disabled]="creating">Create meeting</button>
        </div>
      </form>
    </div>
  `
})
export class MeetingFormComponent {
  protected creating = false;
  protected title = '';
  protected location = '';
  protected startTime = '';
  protected endTime = '';
  protected description = '';
  protected participants = '';

  constructor(public readonly service: MeetingPlannerService, private readonly cd: ChangeDetectorRef, private readonly ngZone: NgZone) {}

  protected submitMeeting() {
    const payload = {
      title: this.title,
      description: this.description,
      startTime: this.startTime,
      endTime: this.endTime,
      location: this.location,
      participantEmails: this.participants.split(',').map((email) => email.trim()).filter(Boolean)
    };

    console.log('[MeetingForm] submitMeeting: start', { payload, creatingBefore: this.creating, serviceLoading: this.service.loading });
    this.creating = true;
    this.service.createMeeting(payload).pipe(finalize(() => {
      console.log('[MeetingForm] createMeeting finalize: creatingBeforeClear=', this.creating, 'service.loading=', this.service.loading);
      this.creating = false;
      console.log('[MeetingForm] createMeeting finalize: creatingAfterClear=', this.creating);
      // Force change detection in case view didn't update
      try {
        this.ngZone.run(() => {
          this.cd.detectChanges();
          console.log('[MeetingForm] createMeeting finalize: detectChanges triggered');
        });
      } catch (err) {
        console.warn('[MeetingForm] createMeeting finalize: detectChanges failed', err);
      }
    })).subscribe({
      next: () => {
        console.log('[MeetingForm] createMeeting: next (success)');
        this.service.messageType = 'success';
        this.service.message = 'Meeting created successfully.';
        this.service.loadMeetings();
        this.resetForm();
      },
      error: (error) => {
        console.log('[MeetingForm] createMeeting: error', error);
        this.service.setMessage(this.service.getErrorMessage(error) || 'Unable to create meeting.', 'error');
      }
    });
  }

  private resetForm() {
    this.title = '';
    this.location = '';
    this.startTime = '';
    this.endTime = '';
    this.description = '';
    this.participants = '';
  }
}
