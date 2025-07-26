import { Search, XCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { Business } from "@/lib/schema";
import { useGet } from "@/lib/gun/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Link } from "@tanstack/react-router";
import { Badge } from "./ui/badge"; // Import Badge

export interface BusinessListProps extends React.ComponentPropsWithoutRef<typeof ScrollArea> { }

export function BusinessList(props: BusinessListProps) {
  const allBusinesses = useGet("business");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBusinesses = allBusinesses.filter((business: Business) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      business.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      business.businessType.toLowerCase().includes(lowerCaseSearchTerm) ||
      (business.location && business.location.toLowerCase().includes(lowerCaseSearchTerm))
    );
  });

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search businesses by name, type, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea {...props}>
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>No businesses found matching your search.</p>
            {searchTerm && (
              <div className="mt-4">
                <Button variant="ghost" onClick={() => setSearchTerm("")}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBusinesses.map((business: Business) => (
              <Card key={business._?.soul} className="relative flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle>{business.name}</CardTitle>
                  {business.location && (
                    <CardDescription className="text-sm text-muted-foreground">
                      {business.location}
                    </CardDescription>
                  )}
                  <Badge variant="secondary" className="absolute top-3 right-3 capitalize text-xs px-2 py-1 rounded-full">
                    {business.businessType.replace(/_/g, " ")}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-end pt-0">
                  <Button asChild className="w-full">
                    <Link to={`/${business.basePath}`}>
                      Visit
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
