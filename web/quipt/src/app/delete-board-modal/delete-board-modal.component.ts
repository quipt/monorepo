import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

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
