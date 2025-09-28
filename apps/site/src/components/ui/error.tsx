export function ErrorComponent() {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-3xl font-bold">Oops!</h1>
            <p className="text-muted-foreground">
                Something went wrong. Please try again later.
            </p>
        </div>
    );
}