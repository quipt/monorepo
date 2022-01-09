import {Component, Input, OnInit} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';

@Component({
  selector: 'app-video-card',
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss'],
})
export class VideoCardComponent implements OnInit {
  @Input() source: string | SafeUrl = '';
  @Input() poster = '';
  @Input() caption = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {}

  onClick($event: MouseEvent) {
    $event.preventDefault();

    ($event.target as HTMLVideoElement).play();

    return false;
  }

  onDelete($event: MouseEvent) {
    console.log('Delete clicked', $event);
  }
}
