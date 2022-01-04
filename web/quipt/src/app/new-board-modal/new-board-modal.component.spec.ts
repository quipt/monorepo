import {ComponentFixture, TestBed} from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

import {NewBoardModalComponent} from './new-board-modal.component';

describe('NewBoardModalComponent', () => {
  let component: NewBoardModalComponent;
  let fixture: ComponentFixture<NewBoardModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewBoardModalComponent],
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
    fixture = TestBed.createComponent(NewBoardModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
