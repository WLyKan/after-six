import { describe, it, expect, beforeEach } from 'vitest';
import { getStaffId } from '../storage';

describe('getStaffId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null when personInfo not exists', () => {
    expect(getStaffId()).toBeNull();
  });

  it('should return null when personInfo is invalid JSON', () => {
    localStorage.setItem('personInfo', 'invalid');
    expect(getStaffId()).toBeNull();
  });

  it('should return null when staff_id not in personInfo', () => {
    localStorage.setItem('personInfo', JSON.stringify({ name: 'test' }));
    expect(getStaffId()).toBeNull();
  });

  it('should return staff_id when valid personInfo exists', () => {
    localStorage.setItem('personInfo', JSON.stringify({ staff_id: '12345' }));
    expect(getStaffId()).toBe('12345');
  });
});
