'use client';

import { useCallback, useRef, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Plus, Trash2, Upload } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { createDatasetAction } from '../../experiments/_lib/server/experiments-actions';

interface DatasetItemEntry {
  input: string;
  expected_output: string;
}

interface CreateDatasetDialogProps {
  accountSlug: string;
}

export default function CreateDatasetDialog({
  accountSlug,
}: CreateDatasetDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [tab, setTab] = useState('upload');
  const [jsonItems, setJsonItems] = useState<DatasetItemEntry[]>([]);
  const [jsonError, setJsonError] = useState('');
  const [manualItems, setManualItems] = useState<DatasetItemEntry[]>([
    { input: '', expected_output: '' },
  ]);

  function resetForm() {
    setName('');
    setTab('upload');
    setJsonItems([]);
    setJsonError('');
    setManualItems([{ input: '', expected_output: '' }]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) return;

      setJsonError('');

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const parsed: unknown = JSON.parse(e.target?.result as string);

          if (!Array.isArray(parsed)) {
            setJsonError('invalidJson');
            setJsonItems([]);
            return;
          }

          const valid = parsed.every(
            (item: unknown) =>
              typeof item === 'object' &&
              item !== null &&
              'input' in item &&
              typeof (item as Record<string, unknown>).input === 'string' &&
              (item as Record<string, unknown>).input !== '',
          );

          if (!valid) {
            setJsonError('invalidJson');
            setJsonItems([]);
            return;
          }

          const items = parsed.map((item: Record<string, unknown>) => ({
            input: String(item.input),
            expected_output: item.expected_output
              ? String(item.expected_output)
              : '',
          }));

          setJsonItems(items);
          setJsonError('');
        } catch {
          setJsonError('invalidJson');
          setJsonItems([]);
        }
      };

      reader.readAsText(file);
    },
    [],
  );

  function addManualItem() {
    setManualItems((prev) => [...prev, { input: '', expected_output: '' }]);
  }

  function removeManualItem(index: number) {
    setManualItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateManualItem(
    index: number,
    field: keyof DatasetItemEntry,
    value: string,
  ) {
    setManualItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function getActiveItems(): DatasetItemEntry[] {
    if (tab === 'upload') return jsonItems;
    return manualItems.filter((item) => item.input.trim().length > 0);
  }

  function isFormValid(): boolean {
    if (name.trim().length === 0) return false;

    const items = getActiveItems();
    return items.length > 0;
  }

  function handleCreate() {
    const items = getActiveItems().map((item) => ({
      input: item.input.trim(),
      ...(item.expected_output.trim().length > 0
        ? { expected_output: item.expected_output.trim() }
        : {}),
    }));

    startTransition(async () => {
      await createDatasetAction({
        accountSlug,
        name: name.trim(),
        items,
      });

      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Trans i18nKey="agentguard:datasets.createDataset" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="agentguard:datasets.createDialogTitle" />
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey="agentguard:datasets.createDialogDescription" />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dataset-name">
              <Trans i18nKey="agentguard:datasets.datasetName" />
            </Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer support queries"
              maxLength={255}
            />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">
                <Upload className="mr-2 h-4 w-4" />
                <Trans i18nKey="agentguard:datasets.uploadJson" />
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                <Trans i18nKey="agentguard:datasets.manualEntry" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-3">
              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                />
                {jsonError && (
                  <p className="text-destructive text-xs">
                    <Trans i18nKey={`agentguard:datasets.${jsonError}`} />
                  </p>
                )}
                {jsonItems.length > 0 && !jsonError && (
                  <p className="text-muted-foreground text-xs">
                    <Trans
                      i18nKey="agentguard:datasets.fileSelected"
                      values={{ count: jsonItems.length }}
                    />
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-3">
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {manualItems.map((item, index) => (
                  <div
                    key={index}
                    className="border-border space-y-2 rounded-md border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-medium">
                        Item {index + 1}
                      </span>
                      {manualItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeManualItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Enter input text"
                      value={item.input}
                      onChange={(e) =>
                        updateManualItem(index, 'input', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Enter expected output (optional)"
                      value={item.expected_output}
                      onChange={(e) =>
                        updateManualItem(
                          index,
                          'expected_output',
                          e.target.value,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addManualItem}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                <Trans i18nKey="agentguard:datasets.addItem" />
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            <Trans i18nKey="agentguard:datasets.cancel" />
          </Button>
          <Button onClick={handleCreate} disabled={!isFormValid() || pending}>
            {pending ? (
              <Trans i18nKey="agentguard:datasets.creating" />
            ) : (
              <Trans i18nKey="agentguard:datasets.create" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
