import {
  createAppointmentAction,
  createAvailabilityAction,
  createShiftAction,
} from "@/app/(manager)/manager/schedule/actions";
import type { ScheduleData } from "@/app/(manager)/manager/schedule/_lib/queries";
import { toDateYmd } from "@/app/(manager)/manager/schedule/_lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  filtersData: ScheduleData["filtersData"];
  returnTo: string;
  anchorDate: string;
};

function roundedNowLocalValue() {
  const d = new Date();
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  d.setMinutes(m < 30 ? 30 : 0);
  if (m >= 30) d.setHours(d.getHours() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function ScheduleCreateForms({ filtersData, returnTo, anchorDate }: Props) {
  const startsAtDefault = roundedNowLocalValue();
  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-3">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Create shift</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createShiftAction} className="space-y-3">
            <input type="hidden" name="return_to" value={returnTo} />
            <div className="space-y-2">
              <Label htmlFor="shift_staff_id">Staff</Label>
              <SelectNative id="shift_staff_id" name="staff_id" required>
                <option value="">Select staff</option>
                {filtersData.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift_location_id">Location</Label>
              <SelectNative id="shift_location_id" name="location_id" required>
                <option value="">Select location</option>
                {filtersData.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift_date">Date</Label>
              <Input id="shift_date" name="shift_date" type="date" defaultValue={anchorDate || toDateYmd(new Date())} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="shift_start_time">Start</Label>
                <Input id="shift_start_time" name="start_time" type="time" defaultValue="08:00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift_end_time">End</Label>
                <Input id="shift_end_time" name="end_time" type="time" defaultValue="16:00" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift_notes">Notes</Label>
              <Textarea id="shift_notes" name="notes" rows={2} />
            </div>
            <Button type="submit" size="sm">
              Save shift
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Create availability</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAvailabilityAction} className="space-y-3">
            <input type="hidden" name="return_to" value={returnTo} />
            <div className="space-y-2">
              <Label htmlFor="availability_trainer_id">Trainer</Label>
              <SelectNative id="availability_trainer_id" name="trainer_id" required>
                <option value="">Select trainer</option>
                {filtersData.trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability_location_id">Location</Label>
              <SelectNative id="availability_location_id" name="location_id" required>
                <option value="">Select location</option>
                {filtersData.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability_starts_at">Starts at</Label>
              <Input
                id="availability_starts_at"
                name="starts_at"
                type="datetime-local"
                step={1800}
                defaultValue={startsAtDefault}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Slots are always 30 minutes and must fit inside a trainer shift.
            </p>
            <Button type="submit" size="sm">
              Save slot
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Create appointment</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAppointmentAction} className="space-y-3">
            <input type="hidden" name="return_to" value={returnTo} />
            <div className="space-y-2">
              <Label htmlFor="appointment_client_id">Client</Label>
              <SelectNative id="appointment_client_id" name="client_id" required>
                <option value="">Select client</option>
                {filtersData.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_trainer_id">Primary trainer</Label>
              <SelectNative id="appointment_trainer_id" name="primary_trainer_id" required>
                <option value="">Select trainer</option>
                {filtersData.trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_substitute_id">Substitute trainer (Private only)</Label>
              <SelectNative id="appointment_substitute_id" name="substitute_trainer_id">
                <option value="">None</option>
                {filtersData.trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_location_id">Location</Label>
              <SelectNative id="appointment_location_id" name="location_id" required>
                <option value="">Select location</option>
                {filtersData.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_starts_at">Starts at</Label>
              <Input
                id="appointment_starts_at"
                name="starts_at"
                type="datetime-local"
                step={1800}
                defaultValue={startsAtDefault}
                required
              />
            </div>
            <Button type="submit" size="sm">
              Save appointment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
