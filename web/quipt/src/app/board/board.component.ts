import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit {
  username = '';
  title = 'Board Title';
  clipCount = 0;
  favorites = 0;
  favorited = false;

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe( params => this.username = params.username );
  }

  ngOnInit(): void {
  }

  onFavoriteClick() {
    // API Call

    this.favorited = !this.favorited;
    this.favorites += this.favorited ? 1 : -1
  }
}
