import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = signal<string>('');
  password = signal<string>('');
  errorMessage = signal<string | null>(null);
  loading = signal<boolean>(false);

  onSubmit(): void {
    this.errorMessage.set(null);
    this.loading.set(true);

    this.authService.login(this.username(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Identifiants incorrects');
      }
    });
  }
}