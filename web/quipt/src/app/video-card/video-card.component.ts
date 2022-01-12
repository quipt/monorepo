import {Component, Input, OnInit} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';

@Component({
  selector: 'app-video-card',
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss'],
})
export class VideoCardComponent implements OnInit {
  @Input() clipId = '';
  @Input() source: string | SafeUrl = '';
  @Input() poster = '';
  @Input() caption = '';

  constructor() {}

  ngOnInit(): void {}

  onClick($event: MouseEvent) {
    $event.preventDefault();

    ($event.target as HTMLVideoElement).play();

    return false;
  }

  onDelete($event: MouseEvent, clipId: string) {
    console.log('Delete clicked', $event, clipId);
  }
}
