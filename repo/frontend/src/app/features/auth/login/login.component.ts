import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/state/auth.service';
import { SettingsService } from '../../../core/services/state/settings.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private settings = inject(SettingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private redirectHandled = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  hidePassword = signal(true);

  constructor() {
    effect(() => {
      if (!this.auth.isInitialized() || !this.auth.isAuthenticated() || this.loading()) {
        return;
      }

      queueMicrotask(() => this.navigateAfterAuth());
    });
  }

  private navigateAfterAuth(): void {
    if (this.redirectHandled) {
      return;
    }

    this.redirectHandled = true;
    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
    const destination = redirectTo?.startsWith('/') ? redirectTo : '/dashboard';
    void this.router.navigateByUrl(destination);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.settings.load();
      this.navigateAfterAuth();
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      this.errorMessage.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
