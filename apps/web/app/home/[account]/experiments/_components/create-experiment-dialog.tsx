'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Plus, X } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import type { Dataset } from '~/lib/agentguard/types';

import { createExperimentAction } from '../_lib/server/experiments-actions';

interface VariantRow {
  key: string;
  label: string;
}

interface CreateExperimentDialogProps {
  accountSlug: string;
  datasets: Dataset[];
}

const DEFAULT_VARIANTS: readonly VariantRow[] = [
  { key: 'control', label: 'Control' },
  { key: 'treatment', label: 'Treatment' },
] as const;

function createDefaultVariants(): VariantRow[] {
  return DEFAULT_VARIANTS.map((v) => ({ ...v }));
}

export function CreateExperimentDialog({
  accountSlug,
  datasets,
}: CreateExperimentDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'offline' | 'live'>('offline');
  const [variants, setVariants] = useState<VariantRow[]>(createDefaultVariants);
  const [datasetId, setDatasetId] = useState('');

  function resetForm() {
    setName('');
    setDescription('');
    setMode('offline');
    setVariants(createDefaultVariants());
    setDatasetId('');
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  function handleAddVariant() {
    setVariants((prev) => [...prev, { key: '', label: '' }]);
  }

  function handleRemoveVariant(index: number) {
    setVariants((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleVariantChange(
    index: number,
    field: keyof VariantRow,
    value: string,
  ) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }

  function isFormValid(): boolean {
    if (name.trim().length === 0) return false;
    if (variants.length < 2) return false;

    const allVariantsValid = variants.every(
      (v) => v.key.trim().length > 0 && v.label.trim().length > 0,
    );
    if (!allVariantsValid) return false;

    const uniqueKeys = new Set(variants.map((v) => v.key.trim()));
    if (uniqueKeys.size !== variants.length) return false;

    return true;
  }

  function handleCreate() {
    startTransition(async () => {
      await createExperimentAction({
        accountSlug,
        name: name.trim(),
        description: description.trim() || undefined,
        mode,
        variants: variants.map((v) => ({
          key: v.key.trim(),
          label: v.label.trim(),
        })),
        datasetId: mode === 'offline' && datasetId ? datasetId : undefined,
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
          <Trans i18nKey="agentguard:experiments.createExperiment" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="agentguard:experiments.createExperimentTitle" />
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey="agentguard:experiments.createExperimentDescription" />
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="experiment-name">
              <Trans i18nKey="agentguard:experiments.name" />
            </Label>
            <Input
              id="experiment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GPT-4o vs Claude Sonnet"
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="experiment-description">
              <Trans i18nKey="agentguard:experiments.description" />
            </Label>
            <Textarea
              id="experiment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this experiment is testing..."
              maxLength={1000}
              rows={3}
            />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label>
              <Trans i18nKey="agentguard:experiments.mode" />
            </Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as 'offline' | 'live')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offline">
                  <Trans i18nKey="agentguard:experiments.modeOffline" />
                </SelectItem>
                <SelectItem value="live">
                  <Trans i18nKey="agentguard:experiments.modeLive" />
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Variants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                <Trans i18nKey="agentguard:experiments.variants" />
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariant}
                disabled={variants.length >= 10}
              >
                <Plus className="mr-1 h-3 w-3" />
                <Trans i18nKey="agentguard:experiments.addVariant" />
              </Button>
            </div>
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={variant.key}
                    onChange={(e) =>
                      handleVariantChange(index, 'key', e.target.value)
                    }
                    placeholder="key (e.g., control)"
                    className="flex-1"
                  />
                  <Input
                    value={variant.label}
                    onChange={(e) =>
                      handleVariantChange(index, 'label', e.target.value)
                    }
                    placeholder="Label (e.g., Control)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveVariant(index)}
                    disabled={variants.length <= 2}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset selector — only for offline mode */}
          {mode === 'offline' && datasets.length > 0 && (
            <div className="space-y-2">
              <Label>
                <Trans i18nKey="agentguard:experiments.dataset" />
              </Label>
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name} ({ds.items.length} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            <Trans i18nKey="agentguard:experiments.cancel" />
          </Button>
          <Button onClick={handleCreate} disabled={!isFormValid() || pending}>
            <Trans i18nKey="agentguard:experiments.createExperiment" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
