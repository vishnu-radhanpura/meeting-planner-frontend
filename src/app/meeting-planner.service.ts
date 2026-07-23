import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { API_BASE_URL } from './runtime-config';

@Injectable({ providedIn: 'root' })
export class MeetingPlannerService {
  authMode: 'login' | 'register' = 'login';
  user: any = null;
  userSubject = new BehaviorSubject<any | null>(null);
  user$ = this.userSubject.asObservable();
  meetings: any[] = [];
  private meetingsSubject = new BehaviorSubject<any[]>([]);
  meetings$ = this.meetingsSubject.asObservable();
  message = '';
  messageType: 'success' | 'error' | '' = '';
  private messageSubject = new BehaviorSubject<string | null>(null);
  message$ = this.messageSubject.asObservable();
  private messageTypeSubject = new BehaviorSubject<'success' | 'error' | ''>('');
  messageType$ = this.messageTypeSubject.asObservable();
  loading = false;
  logoutLoading = false;
  participantUpdateLoading = false;

  constructor(private readonly http: HttpClient, @Inject(API_BASE_URL) private readonly apiBase: string) {}

  clearAlerts() {
    this.message = '';
    this.messageType = '';
    this.messageSubject.next(null);
    this.messageTypeSubject.next('');
  }

  setMessage(message: string | null, type: 'success' | 'error' | '' = '') {
    this.message = message ?? '';
    this.messageType = type;
    this.messageSubject.next(this.message || null);
    this.messageTypeSubject.next(this.messageType);
  }

  public getErrorMessage(error: any): string {
    if (!error) {
      return 'An unexpected error occurred.';
    }

    const body = error.error ?? error;

    if (typeof body === 'string') {
      return body;
    }

    if (Array.isArray(body?.errors) && body.errors.length) {
      const errorMessages = body.errors.map((err: any) => {
        if (!err) {
          return null;
        }
        const field = err.field ? `${err.field}: ` : '';
        const message = err.message ?? err.error ?? err;
        return typeof message === 'string' ? `${field}${message}` : `${field}${JSON.stringify(message)}`;
      }).filter(Boolean);
      if (errorMessages.length) {
        return errorMessages.join('\n');
      }
    }

    if (body?.message) {
      return body.message;
    }

    if (body?.error) {
      return body.error;
    }

    if (error.status && error.statusText) {
      return `${error.status} ${error.statusText}`;
    }

    if (error.message) {
      return error.message;
    }

    try {
      return JSON.stringify(body);
    } catch {
      return 'An unexpected error occurred.';
    }
  }

  submitAuth(name: string, email: string, password: string) {
    this.clearAlerts();
    this.loading = true;

    const payload: any = { email, password };
    if (this.authMode === 'register') {
      payload.name = name;
    }

    return this.http
      .post<any>(`${this.apiBase}/${this.authMode}`, payload, { withCredentials: true })
      .pipe(finalize(() => {
        this.loading = false;
      }));
  }

  logout() {
    this.loading = true;
    this.logoutLoading = true;
    this.clearAlerts();

    const clearSessionState = () => {
      this.setUser(null);
      this.meetings = [];
      this.authMode = 'login';
    };

    // Clear UI session state immediately so the logout button and auth form return right away.
    clearSessionState();

    this.http
      .post<any>(`${this.apiBase}/logout`, {}, { withCredentials: true })
      .pipe(finalize(() => {
        this.loading = false;
        this.logoutLoading = false;
      }))
      .subscribe({
        next: (response) => {
          this.setMessage(response?.message || 'Logged out successfully.', 'success');
        },
        error: (error) => {
          this.setMessage(this.getErrorMessage(error) || 'Logout failed.', 'error');
        }
      });
  }

  private normalizeMeeting(meeting: any) {
    const rawParticipants = meeting?.participants ?? meeting?.participantEmails ?? [];
    const participants = Array.isArray(rawParticipants)
      ? rawParticipants.map((participant: any) =>
          typeof participant === 'string' ? { email: participant } : participant
        )
      : [];

    const organizer = meeting?.organizer ?? meeting?.owner ?? meeting?.createdBy ?? null;
    const normalizedOrganizer = typeof organizer === 'string'
      ? { email: organizer }
      : organizer ?? null;

    return {
      ...meeting,
      participants,
      organizer: normalizedOrganizer
    };
  }

  loadMeetings() {
    console.log('[MeetingPlannerService] loadMeetings: start');
    this.loading = true;
    this.http
      .get<any>(`${this.apiBase}/meetings?page=0&size=10`, { withCredentials: true })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          console.log('[MeetingPlannerService] loadMeetings: response', response);
          const meetings = response?.content ?? response ?? [];
          const normalized = Array.isArray(meetings)
            ? meetings.map((meeting: any) => this.normalizeMeeting(meeting))
            : [];
          console.log('[MeetingPlannerService] loadMeetings: normalized meetings', normalized);
          this.meetings = [...normalized];
          this.meetingsSubject.next(this.meetings);
        },
        error: (error) => {
          console.error('[MeetingPlannerService] loadMeetings: error', error);
          this.setMessage(this.getErrorMessage(error) || 'Unable to load meetings.', 'error');
        }
      });
  }

  updateMeetingParticipants(meetingId: string | number, participantEmails: string[]) {
    console.log('[MeetingPlannerService] updateMeetingParticipants: meetingId=', meetingId, 'participantEmails=', participantEmails);
    this.clearAlerts();
    this.participantUpdateLoading = true;

    return this.http
      .put<any>(`${this.apiBase}/meetings/${meetingId}/participants`, { participantEmails }, { withCredentials: true })
      .pipe(finalize(() => {
        console.log('[MeetingPlannerService] updateMeetingParticipants: finalize');
        this.participantUpdateLoading = false;
      }));
  }

  createMeeting(payload: any) {
    console.log('[MeetingPlannerService] createMeeting: start', payload);
    this.clearAlerts();
    this.loading = true;

    return this.http
      .post<any>(`${this.apiBase}/meetings`, payload, { withCredentials: true })
      .pipe(finalize(() => {
        this.loading = false;
        console.log('[MeetingPlannerService] createMeeting: finalize, loading=', this.loading);
      }));
  }

  fetchUserProfile() {
    console.log('[MeetingPlannerService] fetchUserProfile: start');
    this.loading = true;
    return this.http
      .get<any>(`${this.apiBase}/users/me`, { withCredentials: true })
      .pipe(finalize(() => (this.loading = false)));
  }

  getProfileImageUrl(profileImagePath: string | null | undefined) {
    if (!profileImagePath) return null;
    return `${this.apiBase}/profile-pictures/${encodeURIComponent(profileImagePath)}`;
  }

  getDefaultProfileImageUrl() {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='100%' height='100%' fill='%23eef2ff'/><g fill='%232563eb'><circle cx='40' cy='28' r='16'/><rect x='22' y='50' width='36' height='12' rx='6'/></g></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  uploadProfilePicture(file: File) {
    if (!file) {
      throw new Error('No file provided');
    }
    console.log('[MeetingPlannerService] uploadProfilePicture: start', file.name);
    const fd = new FormData();
    fd.append('file', file, file.name);
    this.clearAlerts();
    this.loading = true;
    return this.http
      .post<any>(`${this.apiBase}/users/me/profile-picture`, fd, { withCredentials: true })
      .pipe(finalize(() => {
        this.loading = false;
      }));
  }

  setUser(user: any | null) {
    if (!user) {
      this.user = null;
      this.userSubject.next(null);
      return;
    }

    // Normalize profile image URL if backend provides a profileImagePath
    const profileImagePath = user?.profileImagePath ?? user?.profileImage ?? user?.avatarPath ?? null;
    if (profileImagePath) {
      try {
        user.profilePictureUrl = this.getProfileImageUrl(profileImagePath);
      } catch (err) {
        console.warn('[MeetingPlannerService] setUser: failed to build profilePictureUrl', err);
        user.profilePictureUrl = this.getDefaultProfileImageUrl();
      }
    } else if (!user.profilePictureUrl) {
      // assign a default inline avatar if none provided
      user.profilePictureUrl = this.getDefaultProfileImageUrl();
    }

    this.user = user;
    this.userSubject.next(user);
  }

  updateLocalMeeting(updatedMeeting: any) {
    const meetingId = updatedMeeting.id ?? updatedMeeting._id ?? updatedMeeting.meetingId;
    if (!meetingId) return;
    const idx = this.meetings.findIndex((m) => (m.id ?? m._id ?? m.meetingId) === meetingId);
    if (idx === -1) {
      // append if not found
      this.meetings = [...this.meetings, updatedMeeting];
    } else {
      this.meetings = [
        ...this.meetings.slice(0, idx),
        { ...updatedMeeting },
        ...this.meetings.slice(idx + 1)
      ];
    }
    this.meetingsSubject.next(this.meetings);
  }
}
