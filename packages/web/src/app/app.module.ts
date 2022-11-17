import {BrowserModule} from '@angular/platform-browser';
import {NgModule, APP_INITIALIZER} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {LayoutModule} from '@angular/cdk/layout';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {AuthModule} from '@auth0/auth0-angular';
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ConfigService} from './config.service';
import {ApiService} from './api.service';
import {AuthButtonComponent} from './auth-button/auth-button.component';
import {NotFoundComponent} from './not-found/not-found.component';
import {NavigationComponent} from './navigation/navigation.component';
import {HttpClientModule} from '@angular/common/http';
import {HomeComponent} from './home/home.component';
import {BoardsComponent} from './boards/boards.component';
import {BoardComponent} from './board/board.component';
import {NewBoardModalComponent} from './new-board-modal/new-board-modal.component';
import {VideoCardComponent} from './video-card/video-card.component';
import {MyboardsComponent} from './myboards/myboards.component';
import {DeleteBoardModalComponent} from './delete-board-modal/delete-board-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    AuthButtonComponent,
    HomeComponent,
    NavigationComponent,
    NotFoundComponent,
    BoardsComponent,
    BoardComponent,
    NewBoardModalComponent,
    VideoCardComponent,
    MyboardsComponent,
    DeleteBoardModalComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AuthModule.forRoot(),
    FlexLayoutModule,
    FormsModule,
    LayoutModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatIconModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    NgxGoogleAnalyticsModule.forRoot('G-VKL71RHF8J'),
    NgxGoogleAnalyticsRouterModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [ConfigService],
      useFactory: (configService: ConfigService) => () => configService.load(),
    },
    ApiService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
