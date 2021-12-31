import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import {AuthGuard} from '@auth0/auth0-angular';
import {HomeComponent} from './home/home.component';
import {NotFoundComponent} from './not-found/not-found.component';
import {BoardsComponent} from './boards/boards.component';
import {BoardComponent} from './board/board.component';

const routes: Routes = [
  {path: '', component: HomeComponent},
  {path: ':username', component: BoardsComponent, canActivate: [AuthGuard]},
  {
    path: ':username/boards',
    component: BoardComponent,
    canActivate: [AuthGuard],
  },
  {path: 'myboards', component: BoardsComponent, canActivate: [AuthGuard]},
  {path: '404', component: NotFoundComponent},
  {path: '**', redirectTo: '/404'},
];

@NgModule({
  imports: [
    MatToolbarModule,
    RouterModule.forRoot(routes, {relativeLinkResolution: 'legacy'}),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
