import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/state/auth.service';
import { SettingsService } from '../../../core/services/state/settings.service';

function hasDigitAndLetter(control: AbstractControl) {
  const v: string = control.value ?? '';
  const ok = /[a-zA-Z]/.test(v) && /\d/.test(v);
  return ok ? null : { digitAndLetter: true };
}

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private settings = inject(SettingsService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), hasDigitAndLetter]],
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  hidePassword = signal(true);

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const { name, email, password } = this.form.getRawValue();
      await this.auth.register({ email, password, name: name || undefined });
      await this.settings.load();
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      const msg = err?.error?.error?.message ?? 'Kayıt başarısız. Lütfen tekrar deneyin.';
      this.errorMessage.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
