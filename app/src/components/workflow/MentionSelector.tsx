import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgMemberSummary } from "@/hooks/useOrgMembers";

interface MentionSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  members: OrgMemberSummary[];
  label?: string;
}

export const MentionSelector = ({
  value,
  onChange,
  members,
  label = "Notify team",
}: MentionSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedMembers = useMemo(
    () => members.filter((member) => value.includes(member.id)),
    [members, value],
  );

  const toggleMember = (id: string) => {
    onChange(
      value.includes(id)
        ? value.filter((memberId) => memberId !== id)
        : [...value, id],
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            type="button"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {label}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search team members..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No team members found.</CommandEmpty>
              <CommandGroup>
                {members.map((member) => {
                  const display = member.displayName;
                  return (
                    <CommandItem
                      key={member.id}
                      value={display}
                      onSelect={() => toggleMember(member.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(member.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{display}</span>
                        {member.role && (
                          <span className="text-xs text-muted-foreground">
                            {member.role}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map((member) => (
            <Badge
              key={member.id}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleMember(member.id)}
            >
              {member.displayName}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
