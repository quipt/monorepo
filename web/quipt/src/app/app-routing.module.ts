import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';

const routes: Routes = [];

@NgModule({
  imports: [

    MatToolbarModule,
    RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
