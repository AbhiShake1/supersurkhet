'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Film,
  Popcorn,
  Calendar,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminComponent } from '@/components/ui/admin';

interface Movie {
  id: string;
  title: string;
  genre: string;
  duration: string;
  active: boolean;
}

interface Screen {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
}

interface Snack {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface Showtime {
  id: string;
  movieId: string;
  movieTitle: string;
  screenId: string;
  screenName: string;
  time: string;
  active: boolean;
}

const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'Inception',
    genre: 'Sci-Fi, Thriller',
    duration: '2h 28m',
    active: true,
  },
  {
    id: '2',
    title: 'The Dark Knight',
    genre: 'Action, Crime, Drama',
    duration: '2h 32m',
    active: true,
  },
  {
    id: '3',
    title: 'Interstellar',
    genre: 'Adventure, Drama, Sci-Fi',
    duration: '2h 49m',
    active: false,
  },
];

const mockScreens: Screen[] = [
  {
    id: '1',
    name: 'Screen 1',
    capacity: 100,
    active: true,
  },
  {
    id: '2',
    name: 'Screen 2',
    capacity: 80,
    active: true,
  },
  {
    id: '3',
    name: 'Screen 3',
    capacity: 120,
    active: true,
  },
];

const mockSnacks: Snack[] = [
  {
    id: '1',
    name: 'Large Popcorn',
    price: 250,
    active: true,
  },
  {
    id: '2',
    name: 'Nachos with Cheese',
    price: 300,
    active: true,
  },
  {
    id: '3',
    name: 'Soft Drinks',
    price: 150,
    active: true,
  },
  {
    id: '4',
    name: 'Candy Pack',
    price: 200,
    active: false,
  },
];

const mockShowtimes: Showtime[] = [
  {
    id: '1',
    movieId: '1',
    movieTitle: 'Inception',
    screenId: '1',
    screenName: 'Screen 1',
    time: '2:00 PM',
    active: true,
  },
  {
    id: '2',
    movieId: '1',
    movieTitle: 'Inception',
    screenId: '2',
    screenName: 'Screen 2',
    time: '6:30 PM',
    active: true,
  },
  {
    id: '3',
    movieId: '2',
    movieTitle: 'The Dark Knight',
    screenId: '3',
    screenName: 'Screen 3',
    time: '3:15 PM',
    active: true,
  },
  {
    id: '4',
    movieId: '3',
    movieTitle: 'Interstellar',
    screenId: '1',
    screenName: 'Screen 1',
    time: '9:15 PM',
    active: false,
  },
];

export const CinemaManagement: AdminComponent = () => {
  return (
    <_CinemaManagement
      movies={mockMovies}
      screens={mockScreens}
      snacks={mockSnacks}
      showtimes={mockShowtimes}
      onAddMovie={() => {}}
      onAddScreen={() => {}}
      onAddSnack={() => {}}
      onAddShowtime={() => {}}
    />
  );
};

interface CinemaManagementProps {
  onAddMovie: () => void;
  onAddScreen: () => void;
  onAddSnack: () => void;
  onAddShowtime: () => void;
  movies: Movie[];
  screens: Screen[];
  snacks: Snack[];
  showtimes: Showtime[];
}

function _CinemaManagement({
  onAddMovie,
  onAddScreen,
  onAddSnack,
  onAddShowtime,
  movies,
  screens,
  snacks,
  showtimes,
}: CinemaManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('movies');

  const filteredMovies = movies.filter((movie) => {
    return (
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredScreens = screens.filter((screen) => {
    return (
      screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredSnacks = snacks.filter((snack) => {
    return (
      snack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snack.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredShowtimes = showtimes.filter((showtime) => {
    return (
      showtime.movieTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      showtime.screenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      showtime.time.toLowerCase().includes(searchQuery.toLowerCase()) ||
      showtime.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleMovieActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Movie ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleScreenActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Screen ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleSnackActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Snack ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleShowtimeActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Showtime ${active ? 'activated' : 'deactivated'}`);
  };

  const deleteMovie = (_id: string) => {
    // In a real implementation, this would delete the movie from GunDB
    toast.success('Movie removed');
  };

  const deleteScreen = (_id: string) => {
    // In a real implementation, this would delete the screen from GunDB
    toast.success('Screen removed');
  };

  const deleteSnack = (_id: string) => {
    // In a real implementation, this would delete the snack from GunDB
    toast.success('Snack removed');
  };

  const deleteShowtime = (_id: string) => {
    // In a real implementation, this would delete the showtime from GunDB
    toast.success('Showtime removed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Cinema Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your movies, screens, snacks, and showtimes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddMovie} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Movie
          </Button>
          <Button onClick={onAddScreen} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Screen
          </Button>
          <Button onClick={onAddSnack} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Snack
          </Button>
          <Button onClick={onAddShowtime} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Showtime
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Movies
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {movies.filter((m) => m.active).length}
                </p>
              </div>
              <Film className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Screens
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {screens.filter((s) => s.active).length}
                </p>
              </div>
              <Monitor className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Snack Items
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {snacks.filter((s) => s.active).length}
                </p>
              </div>
              <Popcorn className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showtimes
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {showtimes.filter((s) => s.active).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search movies, screens, snacks, or showtimes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Movies, Screens, Snacks, and Showtimes */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger
            value="movies"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Film className="w-4 h-4" />
            <span className="truncate">Movies</span>
          </TabsTrigger>
          <TabsTrigger
            value="screens"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Monitor className="w-4 h-4" />
            <span className="truncate">Screens</span>
          </TabsTrigger>
          <TabsTrigger
            value="snacks"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Popcorn className="w-4 h-4" />
            <span className="truncate">Snacks</span>
          </TabsTrigger>
          <TabsTrigger
            value="showtimes"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span className="truncate">Showtimes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movies" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMovies.map((movie) => (
              <Card
                key={movie.id}
                className={`${!movie.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Film className="w-4 h-4" />
                          {movie.title}
                        </CardTitle>
                        <CardDescription>{movie.genre}</CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          {movie.duration}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={movie.active}
                        onCheckedChange={() =>
                          toggleMovieActive(movie.id, !movie.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {movie.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMovie(movie.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMovies.length === 0 && (
            <div className="text-center py-12">
              <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No movies found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new movie
              </p>
              <Button onClick={onAddMovie}>
                <Plus className="w-4 h-4 mr-2" />
                Add Movie
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="screens" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredScreens.map((screen) => (
              <Card
                key={screen.id}
                className={`${!screen.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          {screen.name}
                        </CardTitle>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          {screen.capacity} seats
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={screen.active}
                        onCheckedChange={() =>
                          toggleScreenActive(screen.id, !screen.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {screen.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteScreen(screen.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredScreens.length === 0 && (
            <div className="text-center py-12">
              <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No screens found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new screen
              </p>
              <Button onClick={onAddScreen}>
                <Plus className="w-4 h-4 mr-2" />
                Add Screen
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="snacks" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSnacks.map((snack) => (
              <Card
                key={snack.id}
                className={`${!snack.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Popcorn className="w-4 h-4" />
                          {snack.name}
                        </CardTitle>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          Rs. {snack.price}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={snack.active}
                        onCheckedChange={() =>
                          toggleSnackActive(snack.id, !snack.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {snack.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSnack(snack.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSnacks.length === 0 && (
            <div className="text-center py-12">
              <Popcorn className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No snacks found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new snack
              </p>
              <Button onClick={onAddSnack}>
                <Plus className="w-4 h-4 mr-2" />
                Add Snack
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="showtimes" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredShowtimes.map((showtime) => (
              <Card
                key={showtime.id}
                className={`${!showtime.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {showtime.movieTitle}
                        </CardTitle>
                        <CardDescription>{showtime.screenName}</CardDescription>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {showtime.time}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={showtime.active}
                        onCheckedChange={() =>
                          toggleShowtimeActive(showtime.id, !showtime.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {showtime.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteShowtime(showtime.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredShowtimes.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No showtimes found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new showtime
              </p>
              <Button onClick={onAddShowtime}>
                <Plus className="w-4 h-4 mr-2" />
                Add Showtime
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
