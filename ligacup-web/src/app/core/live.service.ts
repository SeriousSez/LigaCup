import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
    HubConnection,
    HubConnectionBuilder,
    HubConnectionState,
    LogLevel,
} from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { LiveUpdate } from './models';

export type LiveConnectionState = 'disconnected' | 'connecting' | 'connected';

@Injectable({ providedIn: 'root' })
export class LiveService {
    private readonly auth = inject(AuthService);
    private connection: HubConnection | null = null;
    private currentSlug: string | null = null;
    private handler: ((update: LiveUpdate) => void) | null = null;

    readonly state = signal<LiveConnectionState>('disconnected');

    constructor() {
        inject(DestroyRef).onDestroy(() => void this.stop());
    }

    async watch(slug: string, onUpdate: (update: LiveUpdate) => void): Promise<void> {
        this.handler = onUpdate;

        if (this.connection && this.currentSlug === slug) {
            return;
        }

        await this.stop();
        this.currentSlug = slug;
        this.state.set('connecting');

        this.connection = new HubConnectionBuilder()
            .withUrl(`${environment.apiBaseUrl}/hubs/live`, {
                accessTokenFactory: () => this.auth.token() ?? '',
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)
            .build();

        this.connection.on('liveUpdate', (update: LiveUpdate) => this.handler?.(update));

        this.connection.onreconnecting(() => this.state.set('connecting'));
        this.connection.onreconnected(async () => {
            this.state.set('connected');
            // Group membership is per connection, so rejoin after a reconnect.
            await this.connection?.invoke('JoinTournament', slug);
        });
        this.connection.onclose(() => this.state.set('disconnected'));

        try {
            await this.connection.start();
            await this.connection.invoke('JoinTournament', slug);
            this.state.set('connected');
        } catch {
            this.state.set('disconnected');
        }
    }

    async stop(): Promise<void> {
        if (!this.connection) {
            return;
        }

        const connection = this.connection;
        this.connection = null;

        try {
            if (this.currentSlug && connection.state === HubConnectionState.Connected) {
                await connection.invoke('LeaveTournament', this.currentSlug);
            }
            await connection.stop();
        } catch {
            // A hub that is already gone needs no further tidying up.
        }

        this.currentSlug = null;
        this.state.set('disconnected');
    }
}
