import {Component, Inject} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';

export interface DialogData {
  title: string;
}

@Component({
  selector: 'app-delete-board-modal',
  templateUrl: './delete-board-modal.component.html',
  styleUrls: ['./delete-board-modal.component.scss'],
})
export class DeleteBoardModalComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteBoardModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
