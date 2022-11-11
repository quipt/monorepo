import {Component} from '@angular/core';
import {ConfigService} from '../config.service';
import {AuthService} from '@auth0/auth0-angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  constructor(public config: ConfigService, public auth: AuthService) {}
}
