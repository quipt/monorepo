import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-boards',
  templateUrl: './boards.component.html',
  styleUrls: ['./boards.component.scss']
})
export class BoardsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  boards = [{
    title: 'test board',
  }]

  addBoard() {
    console.log('test');
  }
}
