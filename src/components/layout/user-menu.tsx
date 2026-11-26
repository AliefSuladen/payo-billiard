"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOutAction } from "@/lib/auth/actions";
import { initials } from "@/lib/labels";
import type { AppRole } from "@/types/domain";

type Props = {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  roles: AppRole[];
};

export function UserMenu({ name, username, avatarUrl, roles }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu akun"
        className="rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-9 border border-white/10">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{name}</span>
            {username ? (
              <span className="truncate text-xs font-normal text-muted-foreground">@{username}</span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboard /> Dashboard
        </DropdownMenuItem>
        {roles.includes("admin") ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <ShieldCheck /> Admin
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
          <Settings /> Pengaturan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOutAction()}>
          <LogOut /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
