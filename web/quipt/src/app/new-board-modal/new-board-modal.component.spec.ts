import {ComponentFixture, TestBed} from '@angular/core/testing';

import {NewBoardModalComponent} from './new-board-modal.component';

describe('NewBoardModalComponent', () => {
  let component: NewBoardModalComponent;
  let fixture: ComponentFixture<NewBoardModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewBoardModalComponent],
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
