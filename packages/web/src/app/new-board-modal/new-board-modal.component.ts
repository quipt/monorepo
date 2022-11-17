import {Component, Inject} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';

export interface DialogData {
  title: string;
}

@Component({
  selector: 'app-new-board-modal',
  templateUrl: './new-board-modal.component.html',
  styleUrls: ['./new-board-modal.component.scss'],
})
export class NewBoardModalComponent {
  constructor(
    public dialogRef: MatDialogRef<NewBoardModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
