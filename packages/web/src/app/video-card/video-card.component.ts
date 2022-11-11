import {Component, Input, OnInit, Output, EventEmitter} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {Clip} from '../board/board.component';

@Component({
  selector: 'app-video-card',
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss'],
})
export class VideoCardComponent implements OnInit {
  @Input() canEdit = false;
  @Input() clipId = '';
  @Input() source: string | SafeUrl = '';
  @Input() poster = '';
  @Input() caption = '';
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() captionChangedEvent = new EventEmitter<Clip>();

  constructor() {}

  ngOnInit(): void {}

  onClick($event: MouseEvent) {
    $event.preventDefault();
    const target = $event.target as HTMLVideoElement;

    if (target.paused) {
      target.play();
    } else {
      target.pause();
    }

    return false;
  }

  onDelete($event: MouseEvent, clipId: string) {
    this.deleteEvent.emit(clipId);
  }

  onBlur($event: FocusEvent) {
    const text = ($event.target as HTMLDivElement).innerText;
    this.captionChangedEvent.emit({
      clipId: this.clipId,
      caption: text,
    });
  }
}
