import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProfile } from "@/hooks/use-profile";
import { useRouteContext, Link } from "@tanstack/react-router";
import { useAuth } from "../auth-provider";
import { cn } from "@/lib/utils";

export interface UserAvatarDropdownProps extends React.ComponentProps<"button"> {
  button: {
    className?: string;
  }
}

export function UserAvatarDropdown(props: UserAvatarDropdownProps) {
  const { auth } = useRouteContext({ from: "__root__" });
  const { isAuthenticated } = useAuth()
  const user = useProfile();

  return <>
    {
      isAuthenticated ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              {...props}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2 py-1 hover:bg-muted/50 transition justify-center",
                props.className,
              )}
            >
              {
                props.children || <Avatar>
                  <AvatarImage src={user?.avatar} alt={""} />
                  <AvatarFallback className="capitalize">
                    {user?.email?.[0]}
                  </AvatarFallback>
                </Avatar>
              }
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-56 p-0 overflow-hidden"
          >
            <div className="flex flex-col items-center gap-2 p-4 border-b">
              <Avatar>
                <AvatarImage src={user?.avatar} alt={""} />
                <AvatarFallback className="capitalize">
                  {user?.email?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-base font-semibold">
                {user?.name || user?.email || "User"}
              </div>
            </div>
            <div className="flex flex-col">
              <Link
                to="/settings"
                className="px-4 py-2 hover:bg-muted text-left text-sm"
              >
                Settings
              </Link>
              <button
                type="button"
                className="px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={() => auth.logout?.()}
              >
                Log out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(props.button.className)}
          >
            <Link to="/auth" search={{ m: "login" }}>
              <span>Login</span>
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className={cn(props.button.className)}
          >
            <Link to="/auth" search={{ m: "signup" }}>
              <span>Sign Up</span>
            </Link>
          </Button>
        </>
      )
    }
  </>
}
