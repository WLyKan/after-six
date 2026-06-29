import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';

interface OvertimeRecord {
  id: string;
  date: string;
  workStart: string;
  workEnd: string;
  overtimeType: string;
  overtimeStart: string;
  overtimeDuration: number;
  notes?: string;
}

interface OvertimeRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: OvertimeRecord | null;
}

export function OvertimeRecordForm({ open, onOpenChange, initialData }: OvertimeRecordFormProps) {
  const [formData, setFormData] = useState({
    date: initialData?.date || '',
    workStart: initialData?.workStart || '09:00',
    workEnd: initialData?.workEnd || '18:00',
    overtimeType: initialData?.overtimeType || '',
    overtimeStart: initialData?.overtimeStart || '',
    overtimeDuration: initialData?.overtimeDuration || 0,
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 实际实现中这里会保存数据
    console.log('保存记录:', formData);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateDuration = () => {
    if (formData.overtimeStart && formData.workEnd) {
      const overtimeStartTime = new Date(`2000-01-01 ${formData.overtimeStart}`);
      const workEndTime = new Date(`2000-01-01 ${formData.workEnd}`);
      
      if (overtimeStartTime >= workEndTime) {
        const duration = (overtimeStartTime.getTime() - workEndTime.getTime()) / (1000 * 60 * 60);
        handleInputChange('overtimeDuration', Math.round(duration * 2) / 2); // 保留0.5小时精度
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? '编辑加班记录' : '新增加班记录'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">日期</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
          </div>

          <Card className="bg-muted/20">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workStart">上班时间</Label>
                  <Input
                    id="workStart"
                    type="time"
                    value={formData.workStart}
                    onChange={(e) => handleInputChange('workStart', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workEnd">下班时间</Label>
                  <Input
                    id="workEnd"
                    type="time"
                    value={formData.workEnd}
                    onChange={(e) => handleInputChange('workEnd', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="overtimeType">加班类型</Label>
            <Select 
              value={formData.overtimeType} 
              onValueChange={(value) => handleInputChange('overtimeType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择加班类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="工作日加班">工作日加班</SelectItem>
                <SelectItem value="周末加班">周末加班</SelectItem>
                <SelectItem value="法定节假日">法定节假日</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overtimeStart">加班开始时间</Label>
              <Input
                id="overtimeStart"
                type="time"
                value={formData.overtimeStart}
                onChange={(e) => {
                  handleInputChange('overtimeStart', e.target.value);
                  setTimeout(calculateDuration, 100);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtimeDuration">加班时长（小时）</Label>
              <Input
                id="overtimeDuration"
                type="number"
                step="0.5"
                min="0"
                value={formData.overtimeDuration}
                onChange={(e) => handleInputChange('overtimeDuration', parseFloat(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              placeholder="加班原因或其他说明..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">
              {initialData ? '更新记录' : '保存记录'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}