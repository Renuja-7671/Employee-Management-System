'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Monitor, Wifi, WifiOff } from 'lucide-react';

interface BiometricDevice {
  id: string;
  name: string;
  deviceType: 'HIKVISION' | 'ZKTeco' | 'Other';
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  serialNumber: string | null;
  model: string | null;
  firmwareVersion: string | null;
  macAddress: string | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FormData {
  name: string;
  deviceType: 'HIKVISION' | 'ZKTeco' | 'Other';
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  serialNumber: string;
  model: string;
  firmwareVersion: string;
  macAddress: string;
  isActive: boolean;
}

export function BiometricDevices() {
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    deviceType: 'HIKVISION',
    ipAddress: '',
    port: 80,
    username: 'admin',
    password: '',
    serialNumber: '',
    model: '',
    firmwareVersion: '',
    macAddress: '',
    isActive: true,
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/admin/biometric-devices', {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch biometric devices');
    }
  };

  const handleOpenDialog = (device?: BiometricDevice) => {
    if (device) {
      setEditingId(device.id);
      setFormData({
        name: device.name,
        deviceType: device.deviceType,
        ipAddress: device.ipAddress,
        port: device.port,
        username: device.username,
        password: device.password,
        serialNumber: device.serialNumber || '',
        model: device.model || '',
        firmwareVersion: device.firmwareVersion || '',
        macAddress: device.macAddress || '',
        isActive: device.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        deviceType: 'HIKVISION',
        ipAddress: '',
        port: 80,
        username: 'admin',
        password: '',
        serialNumber: '',
        model: '',
        firmwareVersion: '',
        macAddress: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      deviceType: 'HIKVISION',
      ipAddress: '',
      port: 80,
      username: 'admin',
      password: '',
      serialNumber: '',
      model: '',
      firmwareVersion: '',
      macAddress: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.ipAddress || !formData.username || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const url = editingId
        ? `/api/admin/biometric-devices/${editingId}`
        : '/api/admin/biometric-devices';

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          serialNumber: formData.serialNumber || null,
          model: formData.model || null,
          firmwareVersion: formData.firmwareVersion || null,
          macAddress: formData.macAddress || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        handleCloseDialog();
        fetchDevices();
      } else {
        toast.error(data.error || 'Failed to save device');
      }
    } catch (error) {
      console.error('Error saving device:', error);
      toast.error('Failed to save device');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this biometric device?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/biometric-devices/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchDevices();
      } else {
        toast.error(data.error || 'Failed to delete device');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Biometric Devices</CardTitle>
              <CardDescription>
                Manage fingerprint and biometric devices for attendance tracking
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No biometric devices found
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Monitor className="w-4 h-4 mr-2 text-gray-500" />
                          {device.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {device.deviceType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{device.ipAddress}</span>
                      </TableCell>
                      <TableCell>{device.port}</TableCell>
                      <TableCell>
                        {device.serialNumber ? (
                          <span className="font-mono text-sm">{device.serialNumber}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {device.model ? (
                          <span className="text-sm">{device.model}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {device.isActive ? (
                          <div className="flex items-center text-green-600">
                            <Wifi className="w-4 h-4 mr-1" />
                            <span className="text-sm">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <WifiOff className="w-4 h-4 mr-1" />
                            <span className="text-sm">Inactive</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {device.lastSyncAt ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(device.lastSyncAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(device)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(device.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Biometric Device' : 'Add Biometric Device'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the biometric device details'
                : 'Register a new biometric device for attendance tracking'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Entrance Terminal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deviceType">Device Type *</Label>
                <Select
                  value={formData.deviceType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, deviceType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIKVISION">Hikvision</SelectItem>
                    <SelectItem value="ZKTeco">ZKTeco</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address *</Label>
                <Input
                  id="ipAddress"
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, ipAddress: e.target.value })
                  }
                  placeholder="e.g., 192.168.1.100"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData({ ...formData, port: parseInt(e.target.value) || 80 })
                  }
                  placeholder="e.g., 80"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="e.g., admin"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Device password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., DS-K1A8503EF-B"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firmwareVersion">Firmware Version</Label>
                <Input
                  id="firmwareVersion"
                  value={formData.firmwareVersion}
                  onChange={(e) =>
                    setFormData({ ...formData, firmwareVersion: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="macAddress">MAC Address</Label>
                <Input
                  id="macAddress"
                  value={formData.macAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, macAddress: e.target.value })
                  }
                  placeholder="e.g., 00:11:22:33:44:55"
                />
              </div>

              <div className="col-span-2 flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <Label
                  htmlFor="isActive"
                  className="text-sm font-normal cursor-pointer"
                >
                  Device is active and enabled for attendance tracking
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
