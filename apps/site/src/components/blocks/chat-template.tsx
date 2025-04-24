import { useEffect, useState } from "react";

// ** Custom Hooks **
import { useChat } from "@/lib/gun/hooks/useChat";

// ** UI Components **
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/blocks/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

// ** Dropdown Menu Components **
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ** Icons **
import { cn } from "@/lib/utils";
import {
	Brush,
	Camera,
	ChartBarIncreasing,
	ChevronUp,
	CircleFadingPlus,
	CircleOff,
	CircleUserRound,
	File,
	Image,
	ListFilter,
	Menu,
	MessageCircle,
	MessageSquareDashed,
	MessageSquareDot,
	Mic,
	Paperclip,
	Phone,
	Search,
	Send,
	Settings,
	Smile,
	SquarePen,
	Star,
	User,
	User2,
	UserRound,
	Users,
	Video,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// ** Contact List **
const contactList = [
	{
		name: "Manoj Rayi",
		message: "Your Last Message Here",
		image: "https://github.com/rayimanoj8.png",
	},
	{
		name: "Anjali Kumar",
		message: "Hello, how are you?",
		image: "https://randomuser.me/api/portraits/women/2.jpg",
	},
	{
		name: "Ravi Teja",
		message: "Looking forward to the meeting.",
		image: "https://randomuser.me/api/portraits/men/3.jpg",
	},
	{
		name: "Sneha Reddy",
		message: "Can you send the report?",
		image: "https://randomuser.me/api/portraits/women/4.jpg",
	},
	{
		name: "Arjun Das",
		message: "Thank you for your help!",
		image: "https://randomuser.me/api/portraits/men/5.jpg",
	},
	{
		name: "Priya Sharma",
		message: "Let's catch up soon.",
		image: "https://randomuser.me/api/portraits/women/6.jpg",
	},
	{
		name: "Vikram Singh",
		message: "I will call you later.",
		image: "https://randomuser.me/api/portraits/men/7.jpg",
	},
	{
		name: "Kavya Rao",
		message: "Did you receive my email?",
		image: "https://randomuser.me/api/portraits/women/8.jpg",
	},
	{
		name: "Rahul Verma",
		message: "Meeting rescheduled to tomorrow.",
		image: "https://randomuser.me/api/portraits/men/9.jpg",
	},
	{
		name: "Deepika Nair",
		message: "Happy birthday! Have a great day!",
		image: "https://randomuser.me/api/portraits/women/10.jpg",
	},
	{
		name: "Rohit Malhotra",
		message: "What's the update?",
		image: "https://randomuser.me/api/portraits/men/11.jpg",
	},
	{
		name: "Neha Gupta",
		message: "Hope you're doing well!",
		image: "https://randomuser.me/api/portraits/women/12.jpg",
	},
	{
		name: "Amit Yadav",
		message: "Let's finalize the project.",
		image: "https://randomuser.me/api/portraits/men/13.jpg",
	},
	{
		name: "Simran Kaur",
		message: "Good morning!",
		image: "https://randomuser.me/api/portraits/women/14.jpg",
	},
	{
		name: "Varun Chopra",
		message: "I'll send the documents soon.",
		image: "https://randomuser.me/api/portraits/men/15.jpg",
	},
	{
		name: "Meera Joshi",
		message: "How was your weekend?",
		image: "https://randomuser.me/api/portraits/women/16.jpg",
	},
	{
		name: "Karthik Reddy",
		message: "Please confirm the time.",
		image: "https://randomuser.me/api/portraits/men/17.jpg",
	},
	{
		name: "Pooja Sharma",
		message: "See you at the event!",
		image: "https://randomuser.me/api/portraits/women/18.jpg",
	},
	{
		name: "Sandeep Kumar",
		message: "Just checking in.",
		image: "https://randomuser.me/api/portraits/men/19.jpg",
	},
	{
		name: "Lavanya Patel",
		message: "Don't forget the meeting.",
		image: "https://randomuser.me/api/portraits/women/20.jpg",
	},
	{
		name: "Anjali Sharma",
		image: "https://randomuser.me/api/portraits/women/21.jpg",
		message: "Can you send me the report?",
	},
];

// ** Sidebar Menu Items **
const menuItems = [
	{ title: "Messages", url: "#", icon: MessageCircle },
	{ title: "Phone", url: "#", icon: Phone },
	{ title: "Status", url: "#", icon: CircleFadingPlus },
];

// ** Home Component **
export const Home = () => {
	const { toggleSidebar } = useSidebar();
	const [currentChat, setCurrentChat] = useState(contactList[0]);

	return (
		<>
			{/* Sidebar */}
			<Sidebar variant="floating" collapsible="icon">
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigate</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton onClick={toggleSidebar} asChild>
										<span>
											<Menu />
										</span>
									</SidebarMenuButton>
								</SidebarMenuItem>

								{menuItems.map((item) => (
									<Tooltip key={item.url}>
										<TooltipContent side="right">{item.title}</TooltipContent>
										<TooltipTrigger asChild>
											<SidebarMenuItem key={item.title}>
												<SidebarMenuButton asChild>
													<a href={item.url}>
														<item.icon />
														<span>{item.title}</span>
													</a>
												</SidebarMenuButton>
											</SidebarMenuItem>
										</TooltipTrigger>
									</Tooltip>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton>
								<Settings /> Settings
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton>
										<User2 /> Manoj Rayi
										<ChevronUp className="ml-auto" />
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									side="top"
									className="w-[--radix-popper-anchor-width]"
								>
									<DropdownMenuItem>
										<a href="https://github.com/rayimanoj8/">Account</a>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<span>Back Up</span>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<span>Sign out</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>

			{/* Main Content */}
			<SidebarInset>
				<ResizablePanelGroup direction="horizontal" className="h-screen">
					{/* Left Panel - Chat List */}
					<ResizablePanel defaultSize={25} minSize={20} className="flex-grow">
						<div className="flex flex-col h-screen border ml-1">
							<div className="h-10 px-2 py-4 flex items-center">
								<p className="ml-1">Chats</p>
								<div className="flex justify-end w-full">
									<DropdownMenu>
										<DropdownMenuTrigger>
											<Button variant="ghost" size="icon">
												<SquarePen />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<DropdownMenuItem>
												<User className="size-4 mr-1" /> New Contact
											</DropdownMenuItem>
											<DropdownMenuItem>
												<Users className="size-4 mr-1" /> New Group
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon">
												<ListFilter />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-56">
											<DropdownMenuLabel>Filter Chats By</DropdownMenuLabel>
											<DropdownMenuSeparator />
											<DropdownMenuGroup>
												<DropdownMenuItem>
													<MessageSquareDot className="size-4 mr-1" /> Unread
												</DropdownMenuItem>
												<DropdownMenuItem>
													<Star className="size-4 mr-1" /> Favorites
												</DropdownMenuItem>
												<DropdownMenuItem>
													<CircleUserRound className="size-4 mr-1" /> Contacts
												</DropdownMenuItem>
												<DropdownMenuItem>
													<CircleOff className="size-4 mr-1" /> Non Contacts
												</DropdownMenuItem>
											</DropdownMenuGroup>
											<DropdownMenuSeparator className="size-4 mr-1" />
											<DropdownMenuGroup>
												<DropdownMenuItem>
													<Users className="size-4 mr-1" /> Groups
												</DropdownMenuItem>
												<DropdownMenuItem>
													<MessageSquareDashed className="size-4 mr-1" /> Drafts
												</DropdownMenuItem>
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>

							{/* Search Bar */}
							<div className="relative px-2 py-4">
								<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5" />
								<Input
									placeholder="Search or start new chat"
									className="pl-10"
								/>
							</div>

							{/* Contact List */}
							<ScrollArea className="flex-grow h-screen pb-36">
								{contactList.map((contact, index) => (
									<button
										key={index}
										onClick={() => setCurrentChat(contact)}
										className={cn(
											"px-4 w-full py-2 hover:bg-secondary cursor-pointer text-left relative",
											currentChat?.name === contact.name && "bg-secondary",
										)}
									>
										<div className="flex flex-row gap-2">
											<div className="relative">
												<Avatar className="size-12">
													<AvatarImage src={contact.image} />
													<AvatarFallback>{contact.name[0]}</AvatarFallback>
												</Avatar>
												<span className="absolute bottom-0 right-0 size-3 border-2 border-background bg-green-500 rounded-full" />
											</div>
											<div className="flex-1 space-y-1">
												<div className="flex justify-between items-center">
													<CardTitle className="text-sm">
														{contact.name}
													</CardTitle>
													<span className="text-xs text-muted-foreground">
														12:30 PM
													</span>
												</div>
												<div className="flex justify-between items-center">
													<CardDescription className="text-sm truncate max-w-[180px]">
														{contact.message}
													</CardDescription>
													<div className="size-5 rounded-full bg-primary flex items-center justify-center">
														<span className="text-[10px] font-medium text-primary-foreground">
															2
														</span>
													</div>
												</div>
											</div>
										</div>
									</button>
								))}
							</ScrollArea>
						</div>
					</ResizablePanel>

					<ResizableHandle />

					{/* Right Panel - Chat Window */}
					<ResizablePanel defaultSize={75} minSize={40} className="">
						<div className="flex flex-col justify-between h-screen ml-1 pb-2">
							{/* Chat Header */}
							<div className="h-16 border-b flex items-center px-3">
								<Avatar className="size-12">
									<AvatarImage src={currentChat?.image} />
									<AvatarFallback>PR</AvatarFallback>
								</Avatar>
								<div className="space-y-1 ml-2">
									<CardTitle>{currentChat?.name}</CardTitle>
									<CardDescription>Contact Info</CardDescription>
								</div>
								<div className="flex-grow flex justify-end gap-2">
									<Button variant="ghost" size="icon">
										<Video />
									</Button>
									<Button variant="ghost" size="icon">
										<Phone />
									</Button>
									<Button variant="ghost" size="icon">
										<Search />
									</Button>
								</div>
							</div>

							<ChatBody chat={currentChat} />
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</SidebarInset>
		</>
	);
};

function ChatBody({ chat }: { chat: (typeof contactList)[number] }) {
	const [currentMessage, setCurrentMessage] = useState("");
	// const { rooms } = useChatRooms()
	const chatId = chat?.name || "default";
	const { messages, sendMessage, markAsRead } = useChat(chatId);

	// Reset current message when chat changes
	useEffect(() => {
		setCurrentMessage("");
	}, [chatId]);

	// Mark messages as read when chat changes
	useEffect(() => {
		if (chat?.name) {
			messages.forEach((msg) => {
				if (!msg.read && msg.sender_id !== "current_user") {
					markAsRead(msg._?.soul ?? "");
				}
			});
		}
	}, [chat, messages, markAsRead]);
	return (
		<>
			<ScrollArea className="flex-grow px-4 py-4">
				{messages.map((message, index) => (
					<div
						key={message._?.soul || index}
						className={`flex ${message.sender_id === "current_user" ? "justify-end" : "justify-start"} mb-4`}
					>
						<div
							className={`max-w-[70%] ${message.sender_id === "current_user" ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg px-4 py-2`}
						>
							<p className="text-sm">{message.content}</p>
							<span className="text-xs opacity-70">
								{!!message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
							</span>
						</div>
					</div>
				))}
			</ScrollArea>
			{/* Chat Input */}
			<form
				className="flex items-center h-16 pt-2 border-t px-3"
				onSubmit={(e) => {
					e.preventDefault();
					if (currentMessage.trim()) {
						sendMessage(currentMessage, "current_user", "You");
						setCurrentMessage("");
					}
				}}
			>
				<Button variant="ghost" size="icon">
					<Smile />
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Button variant="ghost" size="icon">
							<Paperclip />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem>
							<Image className="size-4 mr-1" /> Photos & Videos
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Camera className="size-4 mr-1" /> Camera
						</DropdownMenuItem>
						<DropdownMenuItem>
							<File className="size-4 mr-1" /> Document
						</DropdownMenuItem>
						<DropdownMenuItem>
							<UserRound className="size-4 mr-1" /> Contact
						</DropdownMenuItem>
						<DropdownMenuItem>
							<ChartBarIncreasing className="size-4 mr-1" /> Poll
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Brush className="size-4 mr-1" /> Drawing
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Input
					className="flex-grow border-0"
					name="message"
					placeholder="Type a message"
					value={currentMessage}
					onChange={(e) => setCurrentMessage(e.target.value)}
				/>
				<Button variant="ghost" size="icon" type="submit">
					<Send />
				</Button>
				<Button variant="ghost" size="icon">
					<Mic />
				</Button>
			</form>
		</>
	);
}
