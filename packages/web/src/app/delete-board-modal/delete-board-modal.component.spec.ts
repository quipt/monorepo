import {ComponentFixture, TestBed} from '@angular/core/testing';
import {
  MatLegacyDialogModule as MatDialogModule,
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/legacy-dialog';

import {DeleteBoardModalComponent} from './delete-board-modal.component';

describe('NewBoardModalComponent', () => {
  let component: DeleteBoardModalComponent;
  let fixture: ComponentFixture<DeleteBoardModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteBoardModalComponent],
      imports: [MatDialogModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {},
        },
        {
          provide: MatDialogRef,
          useValue: {},
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteBoardModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
