import { ChangeDetectorRef, Component, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MeetingPlannerService } from './meeting-planner.service';

@Component({
  selector: 'app-meeting-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="meeting-list-section" *ngIf="service.user$ | async">
      <div class="section-header">
        <h2>Your meetings</h2>
        <button class="button button-secondary" type="button" (click)="service.loadMeetings()" [disabled]="service.loading">
          Refresh meetings
        </button>
      </div>

      <div class="meeting-grid">
        <article class="meeting-card" *ngFor="let meeting of (service.meetings$ | async)">
          <div class="meeting-meta">
            <strong>{{ meeting.title }}</strong>
            <span class="meeting-status">{{ meeting.status }}</span>
          </div>
          <p>{{ meeting.description }}</p>
          <div class="meeting-details">
            <span>{{ meeting.startTime | date:'short' }} — {{ meeting.endTime | date:'short' }}</span>
            <span>{{ meeting.location }}</span>
          </div>
          <div class="meeting-organizer">
            <strong>Organizer</strong>
            <p>{{ meeting.organizer?.name || meeting.organizer?.email || 'Unknown' }}</p>
            <p *ngIf="meeting.organizer?.email" class="organizer-email">{{ meeting.organizer.email }}</p>
          </div>
          <div class="meeting-participants">
            <strong>Participants</strong>
            <div class="participants-list">
              <span *ngFor="let participant of meeting.participants">
                {{ participant?.email ?? participant?.user?.email ?? participant ?? 'n/a' }}
              </span>
            </div>
          </div>

          <div class="meeting-actions">
            <button class="button button-secondary" type="button" (click)="startEditing(meeting)">
              Update participants
            </button>
          </div>

          <div class="participant-edit" *ngIf="editingMeetingId === (meeting.id ?? meeting._id ?? meeting.meetingId)">
            <label class="field field-full">
              <span>Participants (comma-separated emails)</span>
              <input type="text" [(ngModel)]="participantEditor" name="participantEditor-{{meeting.id}}" />
            </label>
            <div class="form-actions">
              <button class="button button-primary" type="button" (click)="saveParticipants(meeting)" [disabled]="savingParticipants || service.participantUpdateLoading">
                Save participants
              </button>
              <button class="button button-secondary" type="button" (click)="cancelEdit()" [disabled]="savingParticipants || service.participantUpdateLoading">
                Cancel
              </button>
            </div>
          </div>
        </article>

        <article class="meeting-card" *ngIf="(service.meetings$ | async)?.length === 0">
          <p>No meetings found. Create one to get started.</p>
        </article>
      </div>
    </section>
  `
})
export class MeetingListComponent {
  protected editingMeetingId: string | number | null = null;
  protected participantEditor = '';
  protected savingParticipants = false;

  constructor(public readonly service: MeetingPlannerService, private readonly cd: ChangeDetectorRef, private readonly appRef: ApplicationRef) {}

  protected startEditing(meeting: any) {
    this.editingMeetingId = meeting.id ?? meeting._id ?? meeting.meetingId ?? null;
    this.participantEditor = (meeting.participants ?? []).map((participant: any) => participant.email).join(', ');
  }

  protected cancelEdit() {
    this.editingMeetingId = null;
    this.participantEditor = '';
  }

  protected saveParticipants(meeting: any) {
    const meetingId = meeting.id ?? meeting._id ?? meeting.meetingId;
    if (!meetingId) {
      return;
    }

    const participantEmails = this.participantEditor
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    console.log('[MeetingListComponent] saveParticipants: meetingId=', meetingId, 'participantEmails=', participantEmails);
    this.savingParticipants = true;
    this.service.updateMeetingParticipants(meetingId, participantEmails)
      .pipe(finalize(() => {
        this.savingParticipants = false;
        try {
          this.cd.detectChanges();
          console.log('[MeetingListComponent] saveParticipants: finalize detectChanges');
        } catch (err) {
          console.warn('[MeetingListComponent] saveParticipants: finalize detectChanges failed', err);
        }
      }))
      .subscribe({
        next: (response) => {
          console.log('[MeetingListComponent] saveParticipants: response', response);

        // Handle API-level failures that return 200 with success=false
        if (response?.success === false) {
          console.warn('[MeetingListComponent] saveParticipants: API reported failure', response);
          this.service.setMessage(response?.message || response?.error || this.service.getErrorMessage(response) || 'Unable to update participants.', 'error');
          return;
        }

        this.service.setMessage('Participants updated successfully.', 'success');

        const updatedParticipants = participantEmails.map((email) => ({ email }));
        const responseParticipants = response?.participants ?? response?.data?.participants ?? updatedParticipants;
        meeting.participants = Array.isArray(responseParticipants)
          ? responseParticipants.map((participant: any) =>
              typeof participant === 'string' ? { email: participant } : participant
            )
          : updatedParticipants;

        console.log('[MeetingListComponent] saveParticipants: updated local meeting before service update', JSON.stringify(meeting, null, 2));
        // update the service-local meeting list and notify observers
        this.service.updateLocalMeeting(meeting);
        console.log('[MeetingListComponent] saveParticipants: updated service meetings published');
        this.cancelEdit();
        this.savingParticipants = false;
      },
      error: (error) => {
        console.error('[MeetingListComponent] saveParticipants: error', error);
        console.log('[MeetingListComponent] saveParticipants: error.status=', error?.status, 'statusText=', error?.statusText);
        console.log('[MeetingListComponent] saveParticipants: error.error=', error?.error);
        try {
          console.log('[MeetingListComponent] saveParticipants: error.error (stringified)=', JSON.stringify(error?.error));
        } catch (stringifyErr) {
          console.warn('[MeetingListComponent] saveParticipants: could not stringify error.error', stringifyErr);
        }

        // Prefer server-provided message where available
        const serverMessage = error?.error?.message ?? error?.error ?? error?.message ?? null;
        this.service.setMessage(serverMessage || this.service.getErrorMessage(error) || 'Unable to update participants.', 'error');
        console.log('[MeetingListComponent] saveParticipants: set service.message via setMessage', serverMessage);
      }
    });
  }
}
